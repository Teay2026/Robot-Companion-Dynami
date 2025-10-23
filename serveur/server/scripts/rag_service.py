import chromadb
import json
import sys
import os
from datetime import datetime

class SimpleRAGService:
    def __init__(self, data_dir="../data"):
        """Initialize ChromaDB with persistent storage"""
        self.data_dir = os.path.abspath(data_dir)
        os.makedirs(self.data_dir, exist_ok=True)

        # Initialize ChromaDB with persistent storage
        self.client = chromadb.PersistentClient(path=os.path.join(self.data_dir, "chroma_db"))

        # Create or get collection for conversations
        self.collection = self.client.get_or_create_collection(
            name="conversations",
            metadata={"description": "DynAmi conversation memories"}
        )

    def add_conversation(self, conversation_id, message, response, user_id="default", metadata=None):
        """Add a conversation to the vector database"""
        try:
            # Combine message and response for better context
            full_text = f"User: {message}\nRobot: {response}"

            # Prepare metadata
            conv_metadata = {
                "user_id": user_id,
                "timestamp": datetime.now().isoformat(),
                "message": message,
                "response": response
            }

            if metadata:
                conv_metadata.update(metadata)

            # Add to ChromaDB
            self.collection.add(
                documents=[full_text],
                metadatas=[conv_metadata],
                ids=[conversation_id]
            )

            return True

        except Exception as e:
            print(f"Error adding conversation: {e}", file=sys.stderr)
            return False

    def search_conversations(self, query, user_id="default", n_results=5):
        """Search for relevant conversations using semantic similarity"""
        try:
            # Search in ChromaDB
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                where={"user_id": user_id}  # Filter by user
            )

            # Format results
            conversations = []
            if results['documents'] and len(results['documents'][0]) > 0:
                for i in range(len(results['documents'][0])):
                    conversations.append({
                        'id': results['ids'][0][i],
                        'message': results['metadatas'][0][i]['message'],
                        'response': results['metadatas'][0][i]['response'],
                        'timestamp': results['metadatas'][0][i]['timestamp'],
                        'similarity': 1 - results['distances'][0][i],  # Convert distance to similarity
                        'user_id': results['metadatas'][0][i]['user_id']
                    })

            return conversations

        except Exception as e:
            print(f"Error searching conversations: {e}", file=sys.stderr)
            return []

    def get_conversation_count(self, user_id=None):
        """Get total number of conversations"""
        try:
            if user_id:
                result = self.collection.get(where={"user_id": user_id})
                return len(result['ids'])
            else:
                result = self.collection.get()
                return len(result['ids'])
        except Exception as e:
            print(f"Error getting conversation count: {e}", file=sys.stderr)
            return 0

    def migrate_from_json(self, json_file_path):
        """Migrate existing conversations from JSON to ChromaDB"""
        try:
            if not os.path.exists(json_file_path):
                print(f"JSON file not found: {json_file_path}")
                return 0

            with open(json_file_path, 'r') as f:
                conversations = json.load(f)

            migrated_count = 0
            for conv in conversations:
                # Check if already exists
                try:
                    existing = self.collection.get(ids=[conv['id']])
                    if existing['ids']:
                        continue  # Skip if already exists
                except:
                    pass

                # Add to ChromaDB
                success = self.add_conversation(
                    conversation_id=conv['id'],
                    message=conv['message'],
                    response=conv['response'],
                    user_id=conv.get('userContext', {}).get('userId', 'default'),
                    metadata={
                        'visionContext': conv.get('visionContext', ''),
                        'originalTimestamp': conv.get('timestamp', '')
                    }
                )

                if success:
                    migrated_count += 1

            return migrated_count

        except Exception as e:
            print(f"Error migrating from JSON: {e}", file=sys.stderr)
            return 0

    def clear_user_conversations(self, user_id):
        """Clear all conversations for a specific user"""
        try:
            # Get all conversations for user
            result = self.collection.get(where={"user_id": user_id})

            if result['ids']:
                # Delete them
                self.collection.delete(ids=result['ids'])
                return len(result['ids'])
            return 0

        except Exception as e:
            print(f"Error clearing user conversations: {e}", file=sys.stderr)
            return 0

def main():
    """Command line interface for RAG operations"""
    if len(sys.argv) < 2:
        print("Usage: python3 rag_service.py <command> [args...]")
        print("Commands:")
        print("  search <query> [user_id] [n_results]")
        print("  add <message> <response> [user_id]")
        print("  migrate <json_file_path>")
        print("  count [user_id]")
        print("  clear <user_id>")
        sys.exit(1)

    command = sys.argv[1]
    rag = SimpleRAGService()

    try:
        if command == "search":
            if len(sys.argv) < 3:
                print("Error: search requires query")
                sys.exit(1)

            query = sys.argv[2]
            user_id = sys.argv[3] if len(sys.argv) > 3 else "default"
            n_results = int(sys.argv[4]) if len(sys.argv) > 4 else 5

            results = rag.search_conversations(query, user_id, n_results)
            print(json.dumps(results, indent=2))

        elif command == "add":
            if len(sys.argv) < 4:
                print("Error: add requires message and response")
                sys.exit(1)

            message = sys.argv[2]
            response = sys.argv[3]
            user_id = sys.argv[4] if len(sys.argv) > 4 else "default"

            conv_id = f"{user_id}_{datetime.now().timestamp()}"
            success = rag.add_conversation(conv_id, message, response, user_id)
            print(json.dumps({"success": success, "id": conv_id}))

        elif command == "migrate":
            if len(sys.argv) < 3:
                print("Error: migrate requires json file path")
                sys.exit(1)

            json_file = sys.argv[2]
            count = rag.migrate_from_json(json_file)
            print(json.dumps({"migrated": count}))

        elif command == "count":
            user_id = sys.argv[2] if len(sys.argv) > 2 else None
            count = rag.get_conversation_count(user_id)
            print(json.dumps({"count": count}))

        elif command == "clear":
            if len(sys.argv) < 3:
                print("Error: clear requires user_id")
                sys.exit(1)

            user_id = sys.argv[2]
            count = rag.clear_user_conversations(user_id)
            print(json.dumps({"cleared": count}))

        else:
            print(f"Unknown command: {command}")
            sys.exit(1)

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()