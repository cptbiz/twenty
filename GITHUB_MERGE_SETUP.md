# GitHub Merge Functionality Setup Guide

## Обзор

Эта функциональность позволяет администраторам системы управлять файлами на GitHub через merge операции прямо из админ-панели Twenty.

## Компоненты

### Frontend
- **SettingsAdminGithub.tsx** - Основной компонент для управления GitHub merge операциями
- **useGitHubMerge.ts** - Хук для взаимодействия с GraphQL API
- Новая вкладка "GitHub" в админ-панели

### Backend
- **GitHubService** - Сервис для работы с GitHub API
- **GitHubResolver** - GraphQL resolver для expose функциональности
- **GitHubModule** - NestJS модуль для организации кода

## Настройка

### 1. GitHub Token

Добавьте GitHub token в переменные окружения:

```bash
# В файл .env
GITHUB_TOKEN=your_github_personal_access_token
```

**Требуемые права для токена:**
- `repo` - Полный доступ к репозиториям
- `pull_requests:write` - Создание pull requests
- `contents:write` - Изменение содержимого репозитория

### 2. Добавление модуля в основное приложение

Добавьте GitHubModule в главный app.module.ts:

```typescript
import { GitHubModule } from './modules/github/github.module';

@Module({
  imports: [
    // ... другие модули
    GitHubModule,
  ],
})
export class AppModule {}
```

## Использование

1. Откройте админ-панель Twenty (требуется право `canAccessFullAdminPanel`)
2. Перейдите на вкладку "GitHub"
3. Заполните форму:
   - **Repository**: Формат `owner/repo-name` (например, `twentyhq/twenty`)
   - **Source Branch**: Ветка-источник для merge
   - **Target Branch**: Целевая ветка (по умолчанию `main`)
   - **Title**: Заголовок для pull request
   - **Description**: Описание (опционально)

4. Нажмите кнопку "Merge Files"

## Функциональность

### Автоматический Merge
- Создает pull request
- Автоматически выполняет merge
- Возвращает ссылку на созданный PR

### Создание PR без merge
Для будущих версий можно добавить возможность создания PR без автоматического merge.

## Безопасность

- Требуется административные права (`canAccessFullAdminPanel`)
- GitHub token должен быть защищен на серверном уровне
- Все операции логируются

## API Endpoints

### GraphQL Mutations

```graphql
mutation MergeBranches($input: GitHubMergeInput!) {
  mergeBranches(input: $input) {
    success
    pullRequestUrl
    error
  }
}

mutation CreatePullRequest($input: GitHubMergeInput!) {
  createPullRequest(input: $input) {
    success
    pullRequestUrl
    error
  }
}
```

### Input Type

```graphql
input GitHubMergeInput {
  repository: String!
  sourceBranch: String!
  targetBranch: String!
  title: String!
  description: String
}
```

## Ошибки и решения

### "GitHub token not configured"
- Убедитесь, что переменная `GITHUB_TOKEN` установлена
- Перезапустите сервер после добавления токена

### "Invalid repository format"
- Используйте формат `owner/repo-name`
- Проверьте права доступа к репозиторию

### "Failed to create pull request"
- Проверьте, что ветки существуют
- Убедитесь, что нет конфликтов
- Проверьте права токена

## Развитие

### Планируемые функции
- Просмотр истории merge операций
- Управление конфликтами
- Поддержка множественных репозиториев
- Интеграция с webhook'ами

### Структура файлов

```
packages/twenty-front/src/modules/settings/admin-panel/
├── github/
│   ├── components/
│   │   └── SettingsAdminGithub.tsx
│   └── hooks/
│       └── useGitHubMerge.ts

packages/twenty-server/src/modules/github/
├── github.module.ts
├── github.service.ts
└── github.resolver.ts
```