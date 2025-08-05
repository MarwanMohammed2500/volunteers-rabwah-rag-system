# import streamlit as st
# from utils.full_chain import get_response

# def main():
#     st.set_page_config(page_title="RAG Customer Support", page_icon="🤖", layout="centered")
#     st.title("`RAG Customer Support`")
    
#     if "chat_history" not in st.session_state:
#         st.session_state.chat_history = []
        
#     user_query = st.chat_input("Ask a question:")
#     if user_query:
#         response = get_response(user_query=user_query, chat_history=st.session_state.chat_history)
#         st.session_state.chat_history.append((user_query, response['answer'].strip()))
        
#         for chat, answer in st.session_state.chat_history:
#             with st.chat_message("user"):
#                 st.write(chat)
#             with st.chat_message("assistant"):
#                 st.write(answer)
        
#         with st.expander(label="Source Documents"):
#             # source_documents = [doc.page_content for doc in response['source_documents']]
#             # st.write(source_documents)
#             st.write(response['source_documents'])


# if __name__ == "__main__":
#     main()

## =================================================================================
## =================================================================================
## =================================================================================

import streamlit as st
from utils.full_chain import get_response

# Theme colors from logo
PRIMARY_COLOR = "#F47E43"   # Orange
SECONDARY_COLOR = "#1BC6C4"  # Teal
BG_COLOR = "#F8F8F8"

def main():
    st.set_page_config(
        page_title="مساعد إدارة التطوع",
        page_icon="./src/logo.png",
        layout="centered",
        initial_sidebar_state="expanded"
    )

    # Custom style
    st.markdown(f"""
        <style>
        body {{
            direction: rtl;
            background-color: {BG_COLOR};
        }}
        h1 {{
            color: {PRIMARY_COLOR};
            font-size: 2.4rem;
            text-align: center;
        }}
        .block-container {{
            padding-top: 2rem;
            padding-bottom: 2rem;
        }}
        .stChatInputContainer {{
            border-top: 2px solid {PRIMARY_COLOR};
        }}
        .stChatMessage .stMarkdown {{
            font-size: 1.1rem;
            direction: rtl;
            text-align: right;
        }}
        .stExpanderHeader {{
            color: {SECONDARY_COLOR};
        }}
        </style>
    """, unsafe_allow_html=True)

    with st.sidebar:
        st.image("./src/logo.png", width=120)

        st.markdown("""
        ### 🌟 إدارة التطوع

        > **"من دعا إلى هدى كان له من الأجر مثل أجور من تبعه"**

        ✨ ابدأ رحلتك التطوعية وساهم في نشر الخير، فإن مساعدة الآخرين خير زاد لك في الدنيا والآخرة.
        """)

        st.divider()

        st.markdown("""
        ### من نحن

        يعد التطوع ركيزة أساسية في الإسلام، حيث يظهر دوره الكبير والفعّال في تعزيز قيم العطاء والبذل، كما جاء في حديث النبي ﷺ:
        
        > *"إذا قامت الساعة وفي يد أحدكم فسيلة فليغرسها"*

        هذه القيم تدعو إلى الإيجابية والمساهمة المستدامة، وتحث على الإتقان كما قال ﷺ:
        
        > *"إن الله يحب إذا عمل أحدكم عملاً أن يتقنه"*
        """)

        st.divider()

        st.markdown("""
        ### 📞 اتصل بنا

        **الهاتف:** +966566066305  
        **البريد الإلكتروني:** [vol@rabwah.com](mailto:vol@rabwah.com)
        """)


    st.title("مساعد إدارة التطوع")
    
    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    user_query = st.chat_input("اسأل عن الفرص أو كيفية التسجيل...")
    if user_query:
        response = get_response(user_query=user_query, chat_history=st.session_state.chat_history)
        st.session_state.chat_history.append((user_query, response['answer'].strip()))

        for question, answer in st.session_state.chat_history:
            with st.chat_message("user"):
                st.markdown(question)
            with st.chat_message("assistant"):
                st.markdown(answer)

        with st.expander(label="📚 المستندات المرجعية"):
            st.write(response['source_documents'])

if __name__ == "__main__":
    main()