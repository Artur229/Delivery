# Food Delivery Backend Plan

Цей файл - робочий план реалізації backend зі спеки `project.backend.spec.md`.

## Контекст

Backend для food delivery:

- Runtime: Node.js
- Framework: Hono
- Database: Neon PostgreSQL
- ORM: Drizzle ORM
- Validation: Zod
- API Docs: Hono OpenAPI + Scalar UI
- Auth: JWT + refresh tokens у БД
- Realtime: WebSocket
- Payments: Stripe

Головне правило: на фронті сутності шукаються через `slug`, а не через `id`.

## Основні сутності

- `users`
- `refresh_tokens`
- `categories`
- `products`
- `tags`
- `product_categories`
- `product_tags`
- `ingredients`
- `inventory`
- `orders`
- `order_items`
- `reviews`
- `carts`
- `cart_items`
- `chats`
- `messages`

## Ролі

- `owner`
- `admin`
- `customer`
- `chef`
- `courier`

## To-Do

### 1. Project Setup

- [x] Створити Node.js/Hono проєкт.
- [x] Налаштувати TypeScript.
- [x] Додати Drizzle ORM.
- [x] Підключити Neon PostgreSQL.
- [x] Додати Zod.
- [x] Додати Hono OpenAPI + Scalar docs.
- [x] Додати dotenv/env validation.
- [x] Створити health route.

### 2. Shared Infrastructure

- [ ] Єдиний формат помилок: `{ "error": "message", "code": 400 }`.
- [ ] Error middleware.
- [ ] Logger wrapper для auth, orders, payments, admin actions.
- [ ] Slug utility.
- [ ] Password hash utility через bcrypt.
- [ ] JWT utility.
- [ ] Auth middleware.
- [ ] Role middleware: `allowRoles(["owner", "admin"])`.

### 3. Database Schema

- [ ] Описати всі таблиці через Drizzle.
- [ ] Додати relations.
- [ ] Додати indexes/unique constraints.
- [ ] Додати enum-like constants:
  - roles
  - order statuses
  - payment statuses
  - delivery types
  - payment types
- [ ] Згенерувати міграції.
- [ ] Перевірити `drizzle-kit push`.

### 4. Auth

- [ ] `POST /auth/register`
- [ ] `POST /auth/login`
- [ ] `POST /auth/refresh`
- [ ] `POST /auth/logout`
- [ ] Зберігати refresh token у БД.
- [ ] Видаляти refresh token при logout.
- [ ] Не повертати `passwordHash` в API.

### 5. Users

- [ ] `GET /me`
- [ ] `PATCH /me`
- [ ] Admin/owner: список користувачів.
- [ ] Admin/owner: зміна ролі.
- [ ] Admin/owner: блокування reviews через `isBlockedFromReviews`.

### 6. Catalog

- [ ] Categories CRUD.
- [ ] Products CRUD.
- [ ] Tags CRUD.
- [ ] Ingredients для products.
- [ ] Product-category зв'язки.
- [ ] Product-tag зв'язки.
- [ ] Public routes для читання каталогу.
- [ ] Admin/owner routes для зміни каталогу.

### 7. Inventory

- [ ] Inventory CRUD.
- [ ] Оновлювати `updatedAt`.
- [ ] Визначити, чи потрібно автоматично списувати inventory при order.

### 8. Cart

- [ ] Один cart на одного user.
- [ ] `GET /cart`
- [ ] `POST /cart/items`
- [ ] `PATCH /cart/items/:id`
- [ ] `DELETE /cart/items/:id`
- [ ] `DELETE /cart`
- [ ] REST = source of truth.
- [ ] WebSocket event: `cart_updated`.

### 9. Orders

- [ ] Створення order з cart.
- [ ] Розрахунок `totalPrice` на backend.
- [ ] Збереження `order_items` з ціною на момент покупки.
- [ ] Customer бачить свої orders.
- [ ] Admin/owner бачать всі orders.
- [ ] Chef workflow: `paid -> cooking -> ready`.
- [ ] Courier workflow: `ready -> on_the_way -> delivered`.
- [ ] WebSocket event: `order_updated`.

### 10. Payments

- [ ] Stripe checkout/payment intent для `paymentType = card`.
- [ ] Stripe webhook.
- [ ] Оновлення `paymentStatus`.
- [ ] Після успішної оплати переводити order у `paid`.
- [ ] Cash payment flow треба уточнити.

### 11. Reviews

- [ ] Один user може мати тільки один review на product.
- [ ] User може редагувати/видаляти свій review.
- [ ] Admin/owner мають full control.
- [ ] Blocked user не може створювати review.
- [ ] Rating validation, бажано `1..5`.

### 12. Chat

- [ ] Chats table routes.
- [ ] Messages table routes.
- [ ] WebSocket event: `new_message`.
- [ ] Уточнити модель чату: support, order chat або customer-courier.

### 13. WebSocket

- [ ] `/ws` endpoint.
- [ ] Авторизація через JWT.
- [ ] User-specific rooms.
- [ ] Admin room.
- [ ] Chef/courier rooms.
- [ ] Events:
  - `order_updated`
  - `new_message`
  - `cart_updated`

### 14. Validation

- [ ] Zod schema для всіх body/query/params.
- [ ] Auth validation.
- [ ] Catalog validation.
- [ ] Cart validation.
- [ ] Order validation.
- [ ] Review validation.
- [ ] Payment webhook validation.

### 15. OpenAPI

- [ ] Описати всі routes через Hono OpenAPI.
- [ ] Scalar UI: `/api/docs`.
- [ ] OpenAPI JSON: `/api/openapi.json`.

### 16. Seeds

- [ ] 1 owner.
- [ ] 2 admins.
- [ ] 2 chefs.
- [ ] 4 couriers.
- [ ] 10 customers.
- [ ] 5 categories.
- [ ] 15 products.
- [ ] 8 tags.
- [ ] 10 inventory items.
- [ ] Product-category mapping.
- [ ] Product-tag mapping.
- [ ] Hash passwords через bcrypt.

### 17. Tests

- [ ] Auth tests.
- [ ] Slug generation tests.
- [ ] Access control tests.
- [ ] Cart/order flow tests.
- [ ] Review permission tests.
- [ ] Stripe webhook tests with mock payload.
- [ ] Seed sanity test.

## Рекомендований порядок реалізації

1. Project setup + health route.
2. Drizzle schema + migrations.
3. Shared utilities: errors, slug, auth, role middleware.
4. Auth + users.
5. Seeds.
6. Catalog.
7. Cart.
8. Orders.
9. Payments.
10. Reviews.
11. WebSocket.
12. Chat.
13. OpenAPI polish.
14. Tests.

## Питання для уточнення

- Чи генерувати UUID у БД через `defaultRandom()`, чи в коді.
- Точні значення для `deliveryType`, `paymentType`, `paymentStatus`.
- Чи chef/courier бачать всі замовлення, чи тільки assigned.
- Чи потрібна окрема таблиця assignment для chef/courier.
- Чи inventory автоматично списується при order.
- Яка модель chat: support, order chat або customer-courier.
