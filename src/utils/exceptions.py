class IndexNotFound(Exception):
    """
    Exception raised when the Pinecone index doesn't exist
    """
    
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)