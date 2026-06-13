// In-memory Server-Sent Events connection registry

const globalForHub = global;

if (!globalForHub.sseClients) {
  globalForHub.sseClients = new Map(); // Maps userId -> Set of stream controllers
}

export const sseHub = {
  /**
   * Register a user's connection stream controller.
   */
  register(userId, controller) {
    if (!globalForHub.sseClients.has(userId)) {
      globalForHub.sseClients.set(userId, new Set());
    }
    globalForHub.sseClients.get(userId).add(controller);
  },

  /**
   * Unregister a user's connection stream controller.
   */
  unregister(userId, controller) {
    const userClients = globalForHub.sseClients.get(userId);
    if (userClients) {
      userClients.delete(controller);
      if (userClients.size === 0) {
        globalForHub.sseClients.delete(userId);
      }
    }
  },

  /**
   * Push a message payload to all active connections for a specific user.
   */
  sendToUser(userId, data) {
    const userClients = globalForHub.sseClients.get(userId);
    if (userClients) {
      const payload = typeof data === "string" ? data : JSON.stringify(data);
      const chunk = new TextEncoder().encode(`data: ${payload}\n\n`);
      userClients.forEach((controller) => {
        try {
          controller.enqueue(chunk);
        } catch (error) {
          console.error(`SSE send error for user ${userId}:`, error);
          // Auto cleanup failed controller
          this.unregister(userId, controller);
        }
      });
    }
  },

  /**
   * Broadcast a message to all active users belonging to an organization.
   */
  broadcastToOrg(orgMembers, data) {
    // orgMembers: Array of user IDs or OrgMember objects with userId
    orgMembers.forEach((member) => {
      const uId = typeof member === "string" ? member : member.userId;
      this.sendToUser(uId, data);
    });
  }
};

export default sseHub;
