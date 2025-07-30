import os
import mimetypes
import base64
import pickle
from io import BytesIO

from django.shortcuts import render
from django.http import HttpResponse
from django.conf import settings

import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from pandasai import SmartDataframe
from pandasai.llm.openai import OpenAI

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", settings.OPEN_API_KEY)

def chatBot(request):
    context = {}

    # Restore chat history if exists
    chat_history = request.session.get('chat_history', [])
    context['chat_history'] = chat_history

    df = None
    if 'df_pickle' in request.session:
        try:
            df_pickle = base64.b64decode(request.session['df_pickle'].encode('utf-8'))
            df = pickle.loads(df_pickle)
        except Exception as e:
            context['error'] = f"Failed to load previous file: {e}"
            return render(request, 'sheet/bot.html', context)

    if request.method == 'POST':
        uploaded_file = request.FILES.get('file')
        prompt = request.POST.get('prompt')

        if not uploaded_file and not df:
            context['error'] = "Please upload a spreadsheet file."
            return render(request, 'sheet/bot.html', context)

        if not prompt:
            context['error'] = "Please enter a prompt."
            return render(request, 'sheet/bot.html', context)

        try:
            # Handle file upload (replace df if provided)
            if uploaded_file:
                ext = os.path.splitext(uploaded_file.name)[-1].lower()
                if ext == '.csv':
                    df = pd.read_csv(uploaded_file)
                elif ext in ['.xls', '.xlsx']:
                    df = pd.read_excel(uploaded_file, engine='openpyxl')
                else:
                    context['error'] = "Only .csv or .xlsx files are supported."
                    return render(request, 'sheet/bot.html', context)

                # Truncate large file
                if len(df) > 10000:
                    df = df.head(5000)
                    context['note'] = "⚠️ File too large, showing only top 5000 rows."

                # Save to session as base64-encoded pickle
                encoded = base64.b64encode(pickle.dumps(df)).decode('utf-8')
                request.session['df_pickle'] = encoded

            # Ensure we now have df
            if df is None:
                context['error'] = "DataFrame not found."
                return render(request, 'sheet/bot.html', context)

            # AI engine
            llm = OpenAI(api_token=OPENAI_API_KEY)
            sdf = SmartDataframe(df, config={
                "llm": llm,
                "max_rows_to_display": 5,
                "save_charts": True,
                "show_charts": False
            })

            result = sdf.chat(prompt)

            # Chat entry to add
            entry = {'prompt': prompt}

            # Case 1: Image/chart response
            if isinstance(result, str) and os.path.exists(result):
                mime_type, _ = mimetypes.guess_type(result)
                if mime_type and mime_type.startswith("image/"):
                    with open(result, "rb") as f:
                        image_data = f.read()
                    entry['type'] = 'chart'
                    entry['content'] = base64.b64encode(image_data).decode('utf-8')

            # Case 2: matplotlib figure
            elif isinstance(result, plt.Figure):
                buf = BytesIO()
                result.savefig(buf, format='png')
                plt.close(result)
                buf.seek(0)
                entry['type'] = 'chart'
                entry['content'] = base64.b64encode(buf.getvalue()).decode('utf-8')

            # Case 3: DataFrame
            elif isinstance(result, pd.DataFrame):
                preview_html = result.head(5).to_html(classes="preview-table", index=False, border=0)
                excel_buf = BytesIO()
                result.to_excel(excel_buf, index=False)
                excel_buf.seek(0)
                entry['type'] = 'dataframe'
                entry['table'] = preview_html
                entry['file'] = base64.b64encode(excel_buf.read()).decode('utf-8')

            # Case 4: Plain string/text
            else:
                entry['type'] = 'text'
                entry['content'] = str(result)

            # Save to chat history and session
            chat_history.append(entry)
            request.session['chat_history'] = chat_history
            context['chat_history'] = chat_history

        except Exception as e:
            context['error'] = f"❌ Error: {str(e)}"
            return render(request, 'sheet/bot.html', context)

    return render(request, 'sheet/bot.html', context)


def sheetIndex(request):
    return render(request, "sheet/landingPage.html")
