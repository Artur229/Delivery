import { createRoute, z } from "@hono/zod-openapi";
import { createOpenApiApp } from "../lib/openapi.js";
import { asc, desc, eq } from "drizzle-orm";
import { roles, type Role } from "../constants/roles.js";
import { db } from "../db/client.js";
import { chats, messages, users } from "../db/schema.js";
import { forbidden, notFound } from "../lib/errors.js";
import { sendToRoles, sendToUser } from "../lib/realtime.js";
import { authRequired, type AppBindings } from "../middleware/auth.js";

const authOnly = [authRequired];
const staffRoles: Role[] = ["owner", "admin", "chef", "courier"];

const errorResponseSchema = z.object({
  error: z.string(),
  code: z.number(),
});

const chatUserResponseSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    cover: z.string().nullable(),
    role: z.enum(roles),
  })
  .nullable();

const chatResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  user: chatUserResponseSchema,
});

const chatListResponseSchema = z.object({
  chats: z.array(chatResponseSchema),
});

const messageResponseSchema = z.object({
  id: z.string().uuid(),
  chatId: z.string().uuid().nullable(),
  senderId: z.string(),
  text: z.string(),
  createdAt: z.string().nullable(),
});

const messageListResponseSchema = z.object({
  messages: z.array(messageResponseSchema),
});

const chatIdParamSchema = z.object({
  chatId: z.string().uuid(),
});

const createMessageBodySchema = z.object({
  text: z.string().trim().min(1).max(4000),
});

const sharedErrorResponses = {
  401: {
    description: "Unauthorized",
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
  },
  403: {
    description: "Forbidden",
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
  },
  404: {
    description: "Not found",
    content: {
      "application/json": {
        schema: errorResponseSchema,
      },
    },
  },
};

const isStaffRole = (role: string): role is Role => {
  return staffRoles.includes(role as Role);
};

const toChatResponse = (
  chat: typeof chats.$inferSelect & {
    user?: Pick<
      typeof users.$inferSelect,
      "id" | "name" | "slug" | "cover" | "role"
    > | null;
  },
) => ({
  id: chat.id,
  userId: chat.userId,
  user: chat.user
    ? {
        id: chat.user.id,
        name: chat.user.name,
        slug: chat.user.slug,
        cover: chat.user.cover,
        role: chat.user.role,
      }
    : null,
});

const toMessageResponse = (message: typeof messages.$inferSelect) => ({
  id: message.id,
  chatId: message.chatId,
  senderId: message.sender,
  text: message.text,
  createdAt: message.createdAt?.toISOString() ?? null,
});

const getChat = async (chatId: string) => {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          slug: true,
          cover: true,
          role: true,
        },
      },
    },
  });

  if (!chat) {
    throw notFound("Chat not found");
  }

  return chat;
};

const ensureCanAccessChat = (
  role: string,
  actorId: string,
  chatUserId: string | null,
) => {
  if (isStaffRole(role)) {
    return;
  }

  if (chatUserId === actorId) {
    return;
  }

  throw forbidden("You do not have permission to access this chat");
};

const listChatsRoute = createRoute({
  method: "get",
  path: "/chats",
  tags: ["Chat"],
  security: [{ BearerAuth: [] }],
  middleware: authOnly,
  responses: {
    200: {
      description: "Chats available for current user",
      content: {
        "application/json": {
          schema: chatListResponseSchema,
        },
      },
    },
    401: sharedErrorResponses[401],
  },
});

const getOrCreateMyChatRoute = createRoute({
  method: "post",
  path: "/chats",
  tags: ["Chat"],
  security: [{ BearerAuth: [] }],
  middleware: authOnly,
  responses: {
    200: {
      description: "Current user's support chat",
      content: {
        "application/json": {
          schema: chatResponseSchema,
        },
      },
    },
    401: sharedErrorResponses[401],
  },
});

const listMessagesRoute = createRoute({
  method: "get",
  path: "/chats/{chatId}/messages",
  tags: ["Chat"],
  security: [{ BearerAuth: [] }],
  middleware: authOnly,
  request: {
    params: chatIdParamSchema,
  },
  responses: {
    200: {
      description: "Chat messages",
      content: {
        "application/json": {
          schema: messageListResponseSchema,
        },
      },
    },
    ...sharedErrorResponses,
  },
});

const createMessageRoute = createRoute({
  method: "post",
  path: "/chats/{chatId}/messages",
  tags: ["Chat"],
  security: [{ BearerAuth: [] }],
  middleware: authOnly,
  request: {
    params: chatIdParamSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createMessageBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Created chat message",
      content: {
        "application/json": {
          schema: messageResponseSchema,
        },
      },
    },
    ...sharedErrorResponses,
  },
});

export const chatRoute = createOpenApiApp<AppBindings>()
  .openapi(listChatsRoute, async (c) => {
    const currentUser = c.get("currentUser");

    const availableChats = await db.query.chats.findMany({
      where: isStaffRole(currentUser.role)
        ? undefined
        : eq(chats.userId, currentUser.id),
      orderBy: [desc(chats.id)],
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            slug: true,
            cover: true,
            role: true,
          },
        },
      },
    });

    return c.json(
      {
        chats: availableChats.map(toChatResponse),
      },
      200,
    );
  })
  .openapi(getOrCreateMyChatRoute, async (c) => {
    const currentUser = c.get("currentUser");

    const existingChat = await db.query.chats.findFirst({
      where: eq(chats.userId, currentUser.id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            slug: true,
            cover: true,
            role: true,
          },
        },
      },
    });

    if (existingChat) {
      return c.json(toChatResponse(existingChat), 200);
    }

    const [createdChat] = await db
      .insert(chats)
      .values({
        userId: currentUser.id,
      })
      .returning();

    return c.json(toChatResponse(await getChat(createdChat.id)), 200);
  })
  .openapi(listMessagesRoute, async (c) => {
    const currentUser = c.get("currentUser");
    const { chatId } = c.req.valid("param");
    const chat = await getChat(chatId);

    ensureCanAccessChat(currentUser.role, currentUser.id, chat.userId);

    const chatMessages = await db.query.messages.findMany({
      where: eq(messages.chatId, chat.id),
      orderBy: [asc(messages.createdAt)],
    });

    return c.json(
      {
        messages: chatMessages.map(toMessageResponse),
      },
      200,
    );
  })
  .openapi(createMessageRoute, async (c) => {
    const currentUser = c.get("currentUser");
    const { chatId } = c.req.valid("param");
    const body = c.req.valid("json");
    const chat = await getChat(chatId);

    ensureCanAccessChat(currentUser.role, currentUser.id, chat.userId);

    const [createdMessage] = await db
      .insert(messages)
      .values({
        chatId: chat.id,
        sender: currentUser.id,
        text: body.text,
      })
      .returning();

    const response = toMessageResponse(createdMessage);
    const eventPayload = {
      chat: toChatResponse(chat),
      message: response,
    };

    if (chat.userId) {
      sendToUser(chat.userId, "new_message", eventPayload);
    }

    sendToRoles(staffRoles, "new_message", eventPayload);

    return c.json(response, 201);
  });
