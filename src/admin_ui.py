import os
import streamlit as st
from utils.Load_data import loading_data
from utils.Vector_db import add_documents_to_pinecone, delete_vectors_by_source

def main():
    st.set_page_config(layout="wide", page_icon="🤖", page_title="Admin RAG UI")
    st.title("`Admin RAG UI`")
    
    
    st.sidebar.title("`Upload Files or URL`")
    uploaded_files = st.sidebar.file_uploader("`Choose files`", 
                                              accept_multiple_files=True, type=["pdf", "docx", "txt"])
    url = st.sidebar.text_input("`Enter a YouTube URL:`",
                                placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    
    if st.sidebar.button("`Upload and Process Files`"):
        if uploaded_files and url:
            file_paths = []
            for path in uploaded_files:
                temp_file_path = os.path.join(os.getcwd(), path.name)
                with open(temp_file_path, "wb") as temp_file:
                    temp_file.write(path.read())
                file_paths.append(temp_file.name)
                
            with st.spinner("`Processing files...`", show_time=True):
                data = loading_data(file_paths=file_paths, url=url)
                st.write(f"Length of Documents: {len(data)}")
                _ = add_documents_to_pinecone(documents=data)
                _ = [os.remove(file_path) for file_path in file_paths]
            st.success("✅ Files uploaded and processed successfully. 📁")
            
        elif uploaded_files:
            file_paths = []
            for path in uploaded_files:
                temp_file_path = os.path.join(os.getcwd(), path.name)
                with open(temp_file_path, "wb") as temp_file:
                    temp_file.write(path.read())
                file_paths.append(temp_file.name)
                
            with st.spinner("`Processing files...`", show_time=True):
                data = loading_data(file_paths=file_paths)
                st.write(f"Length of Documents: {len(data)}")
                _ = add_documents_to_pinecone(documents=data)
                _ = [os.remove(file_path) for file_path in file_paths]
            st.success("✅ Files uploaded and processed successfully. 📁")
            
        elif url:
            with st.spinner("`Processing URL...`", show_time=True):
                data = loading_data(url=url)
                st.write(f"Length of Documents: {len(data)}")
                _ = add_documents_to_pinecone(documents=data)
                
        else: 
            st.warning("⚠️ Please upload files or enter a YouTube URL.")
            
        
    st.markdown("### `🔥 Delete Vectors by Document Name`")
    with st.form("delete_form"):
        doc_name = st.text_input("Enter the document `source` name (exact match)", placeholder="example.pdf")
        submitted = st.form_submit_button("Delete from Vector DB")

        if submitted:
            if doc_name.strip():
                with st.spinner(f"Deleting vectors for `{doc_name}`..."):
                    delete_vectors_by_source(doc_name)
                st.success(f"✅ Vectors with source `{doc_name}` deleted successfully.")
            else:
                st.warning("⚠️ Please enter a valid document name.")
        
        
    st.sidebar.markdown("---")
    st.sidebar.markdown("Created by [Osama Abo-Bakr](https://osama-abo-bakr.vercel.app/) with ❤️")
    
if __name__ == "__main__":
    main()