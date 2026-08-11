import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { bookId, bookTitle, currentCfi } = await req.json();

    // In a real implementation, this would call OpenAI/Gemini with the book's text up to the currentCfi.
    // For this stretch goal, we return a mock response after a small delay.
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    return NextResponse.json({
      recap: `In "${bookTitle || "this book"}", the story so far has been full of twists. The protagonist has just made a major decision that will change the course of their journey. They are currently facing a significant obstacle, and the tension is rising. Remember, last time you read, they were about to confront their rival. Get ready to dive back in!`
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to generate recap" }, { status: 500 });
  }
}
