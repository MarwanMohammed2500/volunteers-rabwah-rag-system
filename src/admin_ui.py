import os
import streamlit as st
import streamlit_authenticator as stauth
import yaml
from yaml.loader import SafeLoader
from utils.Load_data import loading_data
from utils.Vector_db import add_documents_to_pinecone, delete_vectors_by_source, get_existing_namespaces

with open("src/admin_auth.yaml") as file:
    config = yaml.load(file, Loader=SafeLoader)
    
authenticator = stauth.Authenticate(
    config["credentials"],
    config["cookie"]["key"],
    config["cookie"]["expiry_days"]
)

def main():
    st.set_page_config(layout="wide", page_icon="🤖", page_title="Admin RAG UI")
    st.title("`Admin RAG UI`")
    authenticator.login(location="main")
    name = st.session_state["name"]
    authentication_status = st.session_state["authentication_status"]
    username = st.session_state["username"]
    
    if authentication_status:
        # User is authenticated
        authenticator.logout("Logout", "sidebar")
        st.write(f"Welcome, {name}!")
        
        # ===== NAMESPACE MANAGEMENT SIDEBAR =====
        st.sidebar.title("📁 Namespace Management")
        
        # Get existing namespaces
        try:
            namespaces = get_existing_namespaces("non-profit-rag")
        except Exception as e:
            st.sidebar.error(f"Error loading namespaces: {e}")
            namespaces = []
        
        # List existing namespaces for selection
        st.sidebar.subheader("📂 Select Namespace")
        
        # Add default namespace option
        all_namespace_options = [""] + namespaces if namespaces else [""]
        namespace_display_names = ["(Default)"] + namespaces if namespaces else ["(Default)"]
        
        selected_namespace_index = st.sidebar.selectbox(
            "Choose existing namespace:",
            options=range(len(all_namespace_options)),
            format_func=lambda x: namespace_display_names[x],
            help="Select which namespace to upload documents to",
            key="namespace_selector"
        )
        
        selected_namespace = all_namespace_options[selected_namespace_index]
        namespace_display = namespace_display_names[selected_namespace_index]
        
        if selected_namespace:  # Not default
            st.sidebar.info(f"Selected: **{selected_namespace}**")
        else:
            st.sidebar.info("Selected: **Default Namespace**")
        
        st.sidebar.markdown("---")
        
        # ===== CREATE NEW NAMESPACE SECTION =====
        st.sidebar.subheader("🆕 Create New Namespace")
        
        with st.sidebar.expander("Create by Uploading Files", expanded=False):
            new_namespace = st.text_input(
                "New namespace name:", 
                placeholder="e.g., annual-reports-2024",
                key="new_namespace_input",
                help="Enter a name for the new namespace"
            )
            
            new_namespace_files = st.file_uploader(
                "Upload files for new namespace:", 
                accept_multiple_files=True, 
                type=["pdf", "docx", "txt"],
                key="new_namespace_uploader"
            )
            
            if st.button("🚀 Create Namespace & Upload Files", key="create_namespace_btn"):
                if new_namespace and new_namespace.strip():
                    if new_namespace in namespaces:
                        st.sidebar.warning(f"Namespace '{new_namespace}' already exists!")
                    elif not new_namespace_files:
                        st.sidebar.warning("Please upload files to create the new namespace")
                    else:
                        try:
                            # Process files and create namespace
                            file_paths = []
                            for path in new_namespace_files:
                                temp_file_path = os.path.join(os.getcwd(), path.name)
                                with open(temp_file_path, "wb") as temp_file:
                                    temp_file.write(path.read())
                                file_paths.append(temp_file.name)
                            
                            with st.spinner(f"Creating namespace '{new_namespace}' and uploading files..."):
                                data = loading_data(file_paths=file_paths)
                                st.sidebar.write(f"📄 Processed {len(data)} document chunks")
                                _ = add_documents_to_pinecone(
                                    documents=data, 
                                    namespace=new_namespace
                                )
                                # Clean up temporary files
                                for file_path in file_paths:
                                    if os.path.exists(file_path):
                                        os.remove(file_path)
                                
                                st.sidebar.success(f"✅ Created namespace '{new_namespace}' with {len(data)} document chunks!")
                                st.rerun()  # Refresh to show the new namespace
                        except Exception as e:
                            st.sidebar.error(f"Error creating namespace: {e}")
                            # Clean up temporary files even if there's an error
                            for file_path in file_paths:
                                if os.path.exists(file_path):
                                    os.remove(file_path)
                else:
                    st.sidebar.warning("Please enter a namespace name and upload files")
        
        st.sidebar.markdown("---")
        
        # ===== UPLOAD TO EXISTING NAMESPACE SECTION =====
        st.sidebar.subheader("📤 Add to Existing Namespace")
        
        existing_namespace_files = st.sidebar.file_uploader(
            "Upload files to selected namespace:", 
            accept_multiple_files=True, 
            type=["pdf", "docx", "txt"],
            key="existing_namespace_uploader"
        )
        
        if st.sidebar.button("📥 Upload to Selected Namespace", key="upload_btn"):
            if existing_namespace_files:
                file_paths = []
                for path in existing_namespace_files:
                    temp_file_path = os.path.join(os.getcwd(), path.name)
                    with open(temp_file_path, "wb") as temp_file:
                        temp_file.write(path.read())
                    file_paths.append(temp_file.name)
                        
                with st.spinner(f"Uploading files to '{namespace_display}'..."):
                    try:
                        data = loading_data(file_paths=file_paths)
                        st.write(f"📄 Processed {len(data)} document chunks")
                        _ = add_documents_to_pinecone(
                            documents=data, 
                            namespace=selected_namespace if selected_namespace else None
                        )
                        # Clean up temporary files
                        for file_path in file_paths:
                            if os.path.exists(file_path):
                                os.remove(file_path)
                        st.success(f"✅ Files uploaded to **{namespace_display}** successfully! 📁")
                    except Exception as e:
                        st.error(f"❌ Error processing files: {e}")
                        # Clean up temporary files even if there's an error
                        for file_path in file_paths:
                            if os.path.exists(file_path):
                                os.remove(file_path)
            else:
                st.sidebar.warning("⚠️ Please upload files first.")
        
        # ===== MAIN CONTENT AREA =====
        st.markdown("### 🔥 Delete Vectors by Document Name")
        
        # Show current namespace context
        st.info(f"**Current Namespace:** `{namespace_display}`")
        
        with st.form("delete_form", clear_on_submit=True):
            doc_name = st.text_input(
                "Enter the document `source` name (exact match)", 
                placeholder="example.pdf",
                help="Enter the exact filename as it appears in the vector metadata"
            )
            submitted = st.form_submit_button("Delete from Vector DB")

            if submitted:
                if doc_name.strip():
                    with st.spinner(f"Deleting vectors for `{doc_name}` from '{namespace_display}'..."):
                        try:
                            # Handle default namespace (empty string)
                            namespace_for_delete = selected_namespace if selected_namespace else ""
                            delete_vectors_by_source(doc_name, namespace=namespace_for_delete)
                            st.success(f"✅ Vectors with source `{doc_name}` deleted from **{namespace_display}** successfully.")
                        except Exception as e:
                            st.error(f"❌ Error deleting vectors: {e}")
                else:
                    st.warning("⚠️ Please enter a valid document name.")
        
        # ===== NAMESPACE INFORMATION =====
        st.sidebar.markdown("---")
        st.sidebar.subheader("📊 Namespace Info")
        if namespaces:
            st.sidebar.write(f"**Total namespaces:** {len(namespaces)}")
            st.sidebar.write("**Available namespaces:**")
            st.sidebar.write("• (Default)")
            for ns in namespaces:
                st.sidebar.write(f"• {ns}")
        else:
            st.sidebar.write("Only default namespace available")
            
        st.sidebar.markdown("---")
        st.sidebar.markdown("Created by [Osama Abo-Bakr](https://osama-abo-bakr.vercel.app/) with ❤️")
        
    elif authentication_status is False:
        # Invalid credentials
        st.error("Username or password is incorrect")
    elif authentication_status is None:
        # No login attempt yet
        st.warning("Please enter your username and password")
    
if __name__ == "__main__":
    main()