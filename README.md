# AuraSync Backend

## Stack
- **Node.js** + Express
- **Prisma** ORM + MariaDB/MySQL
- **Socket.IO** — real-time messaging, calls
- **Google OAuth** — authentication
- **Multer** — file uploads
- **JWT** — session tokens

## Setup

```bash
npm install
cp .env.example .env   # fill in your values
npx prisma generate
npx prisma migrate deploy   # production
# OR
npx prisma db push          # development
npm start
```

## Environment Variables
| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL/MariaDB connection string |
| `JWT_SECRET` | Long random string for JWT signing |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `PORT` | Server port (default: 3001) |
| `NODE_ENV` | `production` or `development` |
| `ALLOWED_ORIGINS` | Comma-separated frontend URLs |

## API Routes
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/google` | Google OAuth login |
| GET  | `/api/auth/me` | Get current user |
| PATCH| `/api/auth/profile` | Update username |
| POST | `/api/auth/avatar` | Upload avatar |
| GET  | `/api/auth/search?q=` | Search users |
| POST | `/api/workspaces` | Create workspace |
| GET  | `/api/workspaces` | List my workspaces |
| POST | `/api/workspaces/join` | Join by invite code |
| PATCH| `/api/workspaces/:id` | Update name/description |
| PATCH| `/api/workspaces/:id/avatar` | Update workspace avatar |
| GET  | `/api/channels/workspace/:id` | Get channels |
| POST | `/api/channels` | Create channel |
| GET  | `/api/messages/:channelId` | Get messages |
| POST | `/api/messages/:channelId` | Send message (supports replyTo) |
| PATCH| `/api/messages/:id` | Edit message |
| DELETE| `/api/messages/:id` | Delete message |
| PATCH| `/api/messages/:id/pin` | Pin/unpin message |
| GET  | `/api/threads/:messageId` | Get thread with replies |
| POST | `/api/threads/:messageId/reply` | Add reply |
| DELETE| `/api/threads/reply/:id` | Delete reply |
| GET  | `/api/dm/:userId` | Get DM messages |
| POST | `/api/dm/:userId` | Send DM |
| GET  | `/api/dm/conversations` | List conversations |
| POST | `/api/friends/request` | Send friend request |
| GET  | `/api/friends` | List friends |
| GET  | `/api/bans/:workspaceId` | List bans |

## Socket Events
| Event | Direction | Description |
|---|---|---|
| `join_workspace` | client→server | Join workspace room |
| `join_channel` | client→server | Join channel room |
| `send_message` | client→server | Broadcast message |
| `typing_start/stop` | client→server | Typing indicator |
| `call_join/leave` | client→server | Voice/video call |
| `dm_send` | client→server | Direct message |
| `friend_request_sent` | client→server | Friend request |

## Deployment (Railway / Render / VPS)

1. Set all env variables
2. Run `npm install && npx prisma migrate deploy`
3. Run `npm start`

> For file uploads in production, use S3/Cloudinary instead of local `/uploads`
