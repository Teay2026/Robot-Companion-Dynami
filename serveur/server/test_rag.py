#!/usr/bin/env python3
"""
Simple test script to verify RAG functionality
"""

import sys
import os
import json

# Add the scripts directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'scripts'))

from rag_service import SimpleRAGService

def test_basic_rag():
    """Test basic RAG functionality"""
    print("🧪 Testing Basic RAG Functionality...")

    # Initialize RAG service
    rag = SimpleRAGService()

    # Test data
    test_conversations = [
        {
            "id": "test_1",
            "message": "I love Italian food",
            "response": "That's great! Italian cuisine is delicious.",
            "user_id": "test_user"
        },
        {
            "id": "test_2",
            "message": "Pizza is my favorite meal",
            "response": "Pizza is indeed a wonderful choice!",
            "user_id": "test_user"
        },
        {
            "id": "test_3",
            "message": "I enjoy playing guitar",
            "response": "Music is a beautiful hobby!",
            "user_id": "test_user"
        },
        {
            "id": "test_4",
            "message": "Classical music is beautiful",
            "response": "I agree, classical music has timeless beauty.",
            "user_id": "test_user"
        }
    ]

    # Add test conversations
    print("📝 Adding test conversations...")
    for conv in test_conversations:
        success = rag.add_conversation(
            conv["id"],
            conv["message"],
            conv["response"],
            conv["user_id"]
        )
        if success:
            print(f"✅ Added: {conv['message']}")
        else:
            print(f"❌ Failed: {conv['message']}")

    # Test semantic search queries
    test_queries = [
        ("What cuisine do I enjoy?", "Should find Italian food"),
        ("What instruments do I play?", "Should find guitar"),
        ("What kind of music do I like?", "Should find classical music"),
        ("What's my favorite dish?", "Should find pizza"),
        ("Tell me about my hobbies", "Should find music/guitar")
    ]

    print("\n🔍 Testing Semantic Search...")
    for query, expected in test_queries:
        print(f"\n🔎 Query: '{query}'")
        print(f"   Expected: {expected}")

        results = rag.search_conversations(query, "test_user", 2)

        if results:
            print(f"   Found {len(results)} results:")
            for i, result in enumerate(results):
                similarity = result.get('similarity', 0)
                print(f"     {i+1}. '{result['message']}' (similarity: {similarity:.3f})")
        else:
            print("   ❌ No results found")

    # Test conversation count
    count = rag.get_conversation_count("test_user")
    print(f"\n📊 Total conversations for test_user: {count}")

    # Clean up test data
    print("\n🧹 Cleaning up test data...")
    cleared = rag.clear_user_conversations("test_user")
    print(f"   Cleared {cleared} conversations")

    print("\n✅ RAG test completed!")

def test_semantic_understanding():
    """Test that RAG understands semantic relationships"""
    print("\n🧠 Testing Semantic Understanding...")

    rag = SimpleRAGService()

    # Add some conversations with semantic relationships
    semantic_tests = [
        {
            "id": "sem_1",
            "message": "I drive a Toyota",
            "response": "Toyota makes reliable vehicles.",
            "user_id": "semantic_test"
        },
        {
            "id": "sem_2",
            "message": "I work as a software engineer",
            "response": "Programming is an exciting field!",
            "user_id": "semantic_test"
        }
    ]

    for conv in semantic_tests:
        rag.add_conversation(conv["id"], conv["message"], conv["response"], conv["user_id"])

    # Test semantic queries that don't match exact words
    semantic_queries = [
        ("What car do I have?", "Should find Toyota (car = vehicle)"),
        ("What's my profession?", "Should find software engineer (profession = work)"),
        ("What vehicle do I own?", "Should find Toyota (vehicle = car)"),
        ("What's my job?", "Should find software engineer (job = work)")
    ]

    for query, expected in semantic_queries:
        print(f"\n🔎 Semantic Query: '{query}'")
        print(f"   Expected: {expected}")

        results = rag.search_conversations(query, "semantic_test", 1)

        if results and len(results) > 0:
            result = results[0]
            similarity = result.get('similarity', 0)
            print(f"   ✅ Found: '{result['message']}' (similarity: {similarity:.3f})")
        else:
            print("   ❌ No semantic match found")

    # Clean up
    rag.clear_user_conversations("semantic_test")
    print("\n✅ Semantic understanding test completed!")

if __name__ == "__main__":
    try:
        print("🚀 Starting RAG Tests...")
        test_basic_rag()
        test_semantic_understanding()
        print("\n🎉 All RAG tests completed successfully!")

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)