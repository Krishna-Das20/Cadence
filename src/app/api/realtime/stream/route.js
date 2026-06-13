import sseHub from "@/lib/sseHub";

export async function GET(req) {
  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return Response.json(
      {
        success: false,
        message: "Unauthorized: Missing user authentication context.",
        errors: [],
        data: null,
      },
      { status: 401 }
    );
  }

  let pingIntervalId = null;

  const responseStream = new ReadableStream({
    start(controller) {
      // Register client in global SSE hub
      sseHub.register(userId, controller);

      // Send initial connection verification event
      const initMessage = new TextEncoder().encode(
        `data: ${JSON.stringify({ type: "SYSTEM", text: "Connection established" })}\n\n`
      );
      controller.enqueue(initMessage);

      // Establish a 20-second ping interval to keep connection alive
      pingIntervalId = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(":\n\n")); // SSE comment ping
        } catch (error) {
          console.error("Failed to send SSE ping:", error);
          clearInterval(pingIntervalId);
          sseHub.unregister(userId, controller);
        }
      }, 20000);
    },
    cancel(reason) {
      if (pingIntervalId) {
        clearInterval(pingIntervalId);
      }
      // Clean up connection from memory
      // We need to pass the controller reference to identify it
    }
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
