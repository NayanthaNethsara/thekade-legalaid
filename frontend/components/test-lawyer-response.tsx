"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useChat } from "@/hooks/use-chat"

// Test component to demonstrate lawyer parsing functionality
export function TestLawyerResponse() {
  const { sendMessage } = useChat()

  const testResponses = [
    {
      title: "Format 1 Test",
      response:
        "Based on your case, I recommend these lawyers{name: Sarah Johnson, place: New York NY, link: https://example.com/sarah} and lawyers{name: Michael Chen, place: Los Angeles CA, link: https://example.com/michael}",
    },
    {
      title: "Format 2 Test",
      response:
        "Here are some qualified attorneys: lawyer: Emily Rodriguez (Chicago IL) - https://example.com/emily and lawyer: David Thompson (Houston TX) - https://example.com/david",
    },
    {
      title: "Format 3 Test",
      response:
        'I found these legal professionals: {"name": "Lisa Wang", "place": "San Francisco CA", "link": "https://example.com/lisa"} and {"name": "Robert Miller", "place": "Miami FL", "link": "https://example.com/robert"}',
    },
  ]

  const handleTestResponse = (response: string) => {
    // Simulate a backend response by directly triggering the message
    sendMessage(`Test: ${response}`)
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm">Test Lawyer Response Parsing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {testResponses.map((test, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => handleTestResponse(test.response)}
            className="w-full text-left justify-start h-auto p-2"
          >
            <div>
              <div className="font-medium text-xs">{test.title}</div>
              <div className="text-xs text-muted-foreground truncate">{test.response.substring(0, 60)}...</div>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
