# Development Log

Цей файл - журнал роботи. Перед кожною новою зміною або наступним task потрібно спочатку прочитати цей файл, подивитися останній стан, і тільки потім продовжувати.

## Правило роботи

1. Перед будь-якою дією з кодом або структурою проєкту прочитати `changelog.md`.
2. Звірити останній виконаний крок з `plan.md`.
3. Виконати наступну зміну.
4. Додати новий запис у `changelog.md`: дата, що зроблено, які файли змінено, що робити далі.

## 2026-06-19

### Initial planning files

- Створено `plan.md` з todo-list на основі backend specification.
- Створено `changelog.md` для журналу змін.
- Зафіксовано правило: перед наступними діями спочатку читати log, потім продовжувати від останнього стану.

### Changed files

- `plan.md`
- `changelog.md`

### Next step

- Почати з project setup для Node.js/Hono backend або уточнити відкриті питання з `plan.md`.

### Project setup

- Виконано перший крок з `plan.md`: базовий Node.js/Hono backend setup.
- Створено npm-проєкт з TypeScript.
- Додано залежності: Hono, Node server adapter, Zod, Hono OpenAPI, Scalar API Reference, dotenv, Drizzle ORM, Neon serverless driver.
- Додано dev-залежності: TypeScript, tsx, drizzle-kit, Node types.
- Додано стартовий Hono app.
- Додано health endpoint: `GET /health`.
- Додано OpenAPI JSON endpoint: `GET /api/openapi.json`.
- Додано API docs endpoint: `GET /api/docs`.
- Додано `.env.example`.
- Додано `drizzle.config.ts`.
- Додано placeholder `src/db/schema.ts` для наступного кроку.
- Перевірено `npm run typecheck` - успішно.
- Перевірено `npm run build` - успішно.
- Запущено dev server і перевірено:
  - `GET /health` повертає `status: "ok"`.
  - `GET /api/openapi.json` повертає OpenAPI spec.
- `npm audit` показує 4 moderate vulnerabilities у dev-залежностях через `drizzle-kit` -> `@esbuild-kit` -> `esbuild`. `npm audit fix --force` пропонує breaking downgrade `drizzle-kit`, тому автоматично не застосовувалось.

### Changed files

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `.gitignore`
- `.env.example`
- `drizzle.config.ts`
- `src/app.ts`
- `src/index.ts`
- `src/config/env.ts`
- `src/routes/health.ts`
- `src/db/schema.ts`
- `plan.md`
- `changelog.md`

### Next step

- Перейти до кроку 2 з `plan.md`: shared infrastructure або, якщо йти за технічною залежністю, почати з Drizzle database schema.

### GitHub repository setup

- Встановлено GitHub CLI через Homebrew, бо `gh` не був встановлений.
- Виконано GitHub device login для акаунта `Artur229`.
- Ініціалізовано локальний git repository з гілкою `main`.
- Створено перший коміт: `Initial backend setup`.
- Створено GitHub repository: `https://github.com/Artur229/Delivery`.
- Remote `origin` налаштовано на GitHub repository.

### Changed files

- `changelog.md`

### Next step

- Запушити `main` у GitHub repository.

### Shared infrastructure

- Виконано крок 2 з `plan.md`: shared infrastructure.
- Додано dependency `bcryptjs` для password hashing.
- Додано dependency `jose` для JWT signing/verification.
- Додано roles constants: `owner`, `admin`, `customer`, `chef`, `courier`.
- Додано `AppError` і helpers для стандартних HTTP помилок.
- Додано error handler з форматом відповіді `{ "error": "message", "code": 400 }`.
- Додано `notFound` handler для JSON 404.
- Додано request logger і structured logger для scopes: `auth`, `orders`, `payments`, `admin`, `system`.
- Додано slug utilities:
  - `createSlug`
  - `createUniqueSlug`
- Додано password utilities:
  - `hashPassword`
  - `verifyPassword`
- Додано JWT utilities:
  - `signAuthToken`
  - `verifyAuthToken`
- Додано auth middleware:
  - `authRequired`
- Додано role middleware:
  - `allowRoles(["owner", "admin"])`
- Підключено request logger, error handler і 404 handler в `src/app.ts`.
- Перевірено `npm run typecheck` - успішно.
- Перевірено `npm run build` - успішно.
- Запущено dev server і перевірено:
  - `GET /health` повертає `status: "ok"`.
  - невідомий route повертає JSON `{ "error": "Not found", "code": 404 }`.

### Changed files

- `package.json`
- `package-lock.json`
- `src/app.ts`
- `src/constants/roles.ts`
- `src/lib/errors.ts`
- `src/lib/jwt.ts`
- `src/lib/logger.ts`
- `src/lib/password.ts`
- `src/lib/slug.ts`
- `src/middleware/auth.ts`
- `src/middleware/error-handler.ts`
- `src/middleware/request-logger.ts`
- `src/middleware/roles.ts`
- `plan.md`
- `changelog.md`

### Next step

- Перейти до кроку 3 з `plan.md`: Database Schema через Drizzle.
