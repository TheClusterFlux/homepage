#!/bin/bash
# Script to refresh homepage data from MongoDB
# Usage: ./refresh-data.sh [url]

URL="${1:-https://homepage.theclusterflux.com/api/fetch-data}"

echo "Refreshing data from: $URL"
response=$(curl -s -w "\n%{http_code}" "$URL")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -eq 200 ]; then
    echo "✅ Success! Data refreshed successfully."
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
    echo "❌ Error! HTTP Status: $http_code"
    echo "$body"
    exit 1
fi

