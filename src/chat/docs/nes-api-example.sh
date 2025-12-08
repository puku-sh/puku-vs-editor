#!/bin/bash

# Puku NES API Example
# Shows real API request/response for Next Edit Suggestions

API_KEY="pk_54599884ee8e43ff5c94d77bf4eb9e8c1c5737388caba20e85fb8d30a27044f5314188a920760a656185b6571d0f5c58"
API_URL="https://api.puku.sh/v1/nes/edits"

echo "================================================================"
echo "Puku NES (Next Edit Suggestions) - Live API Test"
echo "================================================================"
echo ""

# Example 1: Simple Error Handling Prediction
echo "📝 Example 1: Predict error handling for try block"
echo "----------------------------------------------------------------"

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "You are a code editing assistant. Predict the user'\''s next logical edit. Output ONLY the code change."
      },
      {
        "role": "user",
        "content": "Current file:\n\nasync function fetchUser(userId: string) {\n  try {\n    const response = await fetch(`/api/users/${userId}`);\n    const data = await response.json();\n    return data;\n    // CURSOR HERE - user just added try block\n  }\n}\n\nRecent edits:\n- Line 2: Added \"try {\" before fetch call\n\nPredict the next edit (add catch block with error handling)."
      }
    ],
    "stream": false,
    "max_tokens": 500,
    "temperature": 0.7
  }' | jq -r '.choices[0].message.content'

echo ""
echo ""

# Example 2: Function Parameter Refactoring
echo "📝 Example 2: Predict call site update after adding parameter"
echo "----------------------------------------------------------------"

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "You are a code editing assistant. Predict the user'\''s next logical edit. Output ONLY the code change."
      },
      {
        "role": "user",
        "content": "Current file:\n\n// Function definition\nfunction calculateTotal(items: Item[], taxRate: number) {\n  return items.reduce((sum, item) => sum + item.price, 0) * (1 + taxRate);\n}\n\n// Call site 1\nconst total1 = calculateTotal(cartItems); // ← TypeScript error: missing argument\n\n// Call site 2\nconst total2 = calculateTotal(orderItems);\n\nRecent edits:\n- Line 2: Added parameter \"taxRate: number\"\n\nPredict the next edit (update first call site with taxRate argument)."
      }
    ],
    "stream": false,
    "max_tokens": 300,
    "temperature": 0.7
  }' | jq -r '.choices[0].message.content'

echo ""
echo ""

# Example 3: Import Prediction
echo "📝 Example 3: Predict missing import"
echo "----------------------------------------------------------------"

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "You are a code editing assistant. Predict the user'\''s next logical edit. Output ONLY the code change."
      },
      {
        "role": "user",
        "content": "Current file:\n\nfunction processData(data: string[]) {\n  return data.map(item => formatCurrency(parseFloat(item))); // ← formatCurrency not imported\n}\n\nRecent edits:\n- Line 2: Used formatCurrency function\n\nPredict the next edit (add import for formatCurrency at top of file)."
      }
    ],
    "stream": false,
    "max_tokens": 200,
    "temperature": 0.7
  }' | jq -r '.choices[0].message.content'

echo ""
echo ""

# Example 4: Streaming Response
echo "📝 Example 4: Streaming NES response (real-time)"
echo "----------------------------------------------------------------"
echo "Streaming code edit suggestions as they arrive..."
echo ""

curl -N -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "You are a code editing assistant. Predict the next edit."
      },
      {
        "role": "user",
        "content": "Add retry logic to this function:\n\nasync function fetchData(url: string) {\n  const response = await fetch(url);\n  return response.json();\n}\n\nPredict: Add retry loop with 3 attempts and exponential backoff."
      }
    ],
    "stream": true,
    "max_tokens": 800,
    "temperature": 0.7
  }' 2>/dev/null | while IFS= read -r line; do
    if [[ $line == data:* ]]; then
      # Extract content from SSE event
      content=$(echo "$line" | sed 's/^data: //' | jq -r '.choices[0].delta.content // empty' 2>/dev/null)
      if [[ -n "$content" && "$content" != "null" ]]; then
        echo -n "$content"
      fi
    fi
  done

echo ""
echo ""

# Example 5: Complex Multi-Location Edit
echo "📝 Example 5: Multi-location refactoring prediction"
echo "----------------------------------------------------------------"

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "You are a code editing assistant. Predict all related edits needed."
      },
      {
        "role": "user",
        "content": "Current file:\n\nclass UserService {\n  getUser(id: string) {\n    return this.db.findOne({ id });\n  }\n\n  getUsers() {\n    return this.db.find();\n  }\n\n  createUser(data: UserData) {\n    return this.db.insert(data);\n  }\n}\n\nRecent edit:\n- Changed getUser to async: async getUser(id: string)\n\nPredict: What other methods need to become async?"
      }
    ],
    "stream": false,
    "max_tokens": 600,
    "temperature": 0.7
  }' | jq -r '.choices[0].message.content'

echo ""
echo ""

echo "================================================================"
echo "✅ All examples completed!"
echo "================================================================"
echo ""
echo "Key Takeaways:"
echo "1. NES predicts NEXT edits based on context"
echo "2. Supports streaming for real-time suggestions"
echo "3. Works with Codestral Mamba (256k context)"
echo "4. Returns code diffs, not explanations"
echo ""
echo "Try it in VS Code: Press Ctrl+I after making an edit!"
echo "================================================================"
