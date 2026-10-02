---
name: graphql
description: GraphQL gives clients exactly the data they need - no more, no. Use when the task involves graphql.
  less. One endpoint, typed schema, introspection. But the flexibility that
  makes it powerful also makes it dangerous. Without proper controls, clients
  can craft queries that bring down your server.
risk: safe
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# GraphQL

GraphQL gives clients exactly the data they need - no more, no less. One
endpoint, typed schema, introspection. But the flexibility that makes it
powerful also makes it dangerous. Without proper controls, clients can
craft queries that bring down your server.

This skill covers schema design, resolvers, DataLoader for N+1 prevention,
federation for microservices, and client integration with Apollo/urql.
Key insight: GraphQL is a contract. The schema is the API documentation.
Design it carefully.

2025 lesson: GraphQL isn't always the answer. For simple CRUD, REST is
simpler. For high-performance public APIs, REST with caching wins. Use
GraphQL when you have complex data relationships and diverse client needs.

## Principles

- Schema-first design - the schema is the contract
- Prevent N+1 queries with DataLoader
- Limit query depth and complexity
- Use fragments for reusable selections
- Mutations should be specific, not generic update operations
- Errors are data - use union types for expected failures
- Nullability is meaningful - design it intentionally

## Capabilities

- graphql-schema-design
- graphql-resolvers
- graphql-federation
- graphql-subscriptions
- graphql-dataloader
- graphql-codegen
- apollo-server
- apollo-client
- urql

## Scope

- database-queries -> postgres-wizard
- authentication -> authentication-oauth
- rest-api-design -> backend
- websocket-infrastructure -> backend

## Tooling

### Server

- @apollo/server - When: Apollo Server v4 Note: Most popular GraphQL server
- graphql-yoga - When: Lightweight alternative Note: Good for serverless
- mercurius - When: Fastify integration Note: Fast, uses JIT

### Client

- @apollo/client - When: Full-featured client Note: Caching, state management
- urql - When: Lightweight alternative Note: Smaller, simpler
- graphql-request - When: Simple requests Note: Minimal, no caching

### Tools

- graphql-codegen - When: Type generation Note: Essential for TypeScript
- dataloader - When: N+1 prevention Note: Batches and caches

## Patterns

### Schema Design

Type-safe schema with proper nullability

**When to use**: Designing any GraphQL API

# SCHEMA DESIGN:

"""
The schema is your API contract. Design nullability
intentionally - non-null fields must always resolve.
"""

type Query {
  # Non-null - will always return user or throw
  user(id: ID!): User!

  # Nullable - returns null if not found
  userByEmail(email: String!): User

  # Non-null list with non-null items
  users(limit: Int = 10, offset: Int = 0): [User!]!

  # Search with pagination
  searchUsers(
    query: String!
    first: Int
    after: String
  ): UserConnection!
}

type Mutation {
  # Input types for complex mutations
  createUser(input: CreateUserInput!): CreateUserPayload!
  updateUser(id: ID!, input: UpdateUserInput!): UpdateUserPayload!
  deleteUser(id: ID!): DeleteUserPayload!
}

type Subscription {
  userCreated: User!
  messageReceived(roomId: ID!): Message!
}

# Input types
input CreateUserInput {
  email: String!
  name: String!
  role: Role = USER
}

input UpdateUserInput {
  email: String
  name: String
  role: Role
}

# Payload types (for errors as data)
type CreateUserPayload {
  user: User
  errors: [Error!]!
}

union UpdateUserPayload = UpdateUserSuccess | NotFoundError | ValidationError

type UpdateUserSuccess {
  user: User!
}

# Enums
enum Role {
  USER
  ADMIN
  MODERATOR
}

# Types with relationships
type User {
  id: ID!
  email: String!
  name: String!
  role: Role!
  posts(limit: Int = 10): [Post!]!
  createdAt: DateTime!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  comments: [Comment!]!
  published: Boolean!
}

# Pagination (Relay-style)
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

### DataLoader for N+1 Prevention

Batch and cache database queries

**When to use**: Resolving relationships

# DATALOADER:

"""
Without DataLoader, fetching 10 posts with authors
makes 11 queries (1 for posts + 10 for each author).
DataLoader batches into 2 queries.
"""

import DataLoader from 'dataloader';

// Create loaders per request
function createLoaders(db) {
  return {
    userLoader: new DataLoader(async (ids) => {
      // Single query for all users
      const users = await db.user.findMany({
        where: { id: { in: ids } }
      });

      // Return in same order as ids
      const userMap = new Map(users.map(u => [u.id, u]));
      return ids.map(id => userMap.get(id) || null);
    }),

    postsByAuthorLoader: new DataLoader(async (authorIds) => {
      const posts = await db.post.findMany({
        where: { authorId: { in: authorIds } }
      });

      // Group by author
      const postsByAuthor = new Map();
      posts.forEach(post => {
        const existing = postsByAuthor.get(post.authorId) || [];
        postsByAuthor.set(post.authorId, [...existing, post]);
      });

      return authorIds.map(id => postsByAuthor.get(id) || []);
    })
  };
}

// Attach to context
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

app.use('/graphql', expressMiddleware(server, {
  context: async ({ req }) => ({
    db,
    loaders: createLoaders(db),
    user: req.user
  })
}));

// Use in resolvers
const resolvers = {
  Post: {
    author: (post, _, { loaders }) => {
      return loaders.userLoader.load(post.authorId);
    }
  },
  User: {
    posts: (user, _, { loaders }) => {
      return loaders.postsByAuthorLoader.load(user.id);
    }
  }
};

### Apollo Client Caching

Normalized cache with type policies

**When to use**: Client-side data management

# APOLLO CLIENT CACHING:

"""
Apollo Client normalizes responses into a flat cache.
Configure type policies for custom cache behavior.
"""

import { ApolloClient, InMemoryCache } from '@apollo/client';

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Paginated field
        users: {
          keyArgs: ['query'],  // Cache separately per query
          merge(existing = { edges: [] }, incoming, { args }) {
            // Append for infinite scroll
            if (args?.after) {
              return {
                ...incoming,
                edges: [...existing.edges, ...incoming.edges]
              };
            }
            return incoming;
          }
        }
      }
    },
    User: {
      keyFields: ['id'],  // How to identify users
      fields: {
        fullName: {
          read(_, { readField }) {
            // Computed field
            return `${readField('firstName')} ${readField('lastName')}`;
          }
        }
      }
    }
  }
});

const client = new ApolloClient({
  uri: '/graphql',
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network'
    }
  }
});

// Queries with hooks
import { useQuery, useMutation } from '@apollo/client';

const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`;

function UserProfile({ userId }) {
  const { data, loading, error } = useQuery(GET_USER, {
    variables: { id: userId }
  });

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return <div>{data.user.name}</div>;
}

// Mutations with cache updates
const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      user {
        id
        name
        email
      }
      errors {
        field
        message
      }
    }
  }
`;

function CreateUserForm() {
  const [createUser, { loading }] = useMutation(CREATE_USER, {
    update(cache, { data: { createUser } }) {
      // Update cache after mutation
      if (createUser.user) {
        cache.modify({
          fields: {
            users(existing = []) {
              const newRef = cache.writeFragment({
                data: createUser.user,
                fragment: gql`
                  fragment NewUser on User {
                    id
                    name
                    email
                  }
                `
              });
              return [...existing, newRef];
            }
          }
        });
      }
    }
  });
}

### Code Generation

Type-safe operations from schema

**When to use**: TypeScript projects

# GRAPHQL CODEGEN:

"""
Generate TypeScript types from your schema and operations.
No more manually typing query responses.
"""

# Install
npm install -D @graphql-codegen/cli
npm install -D @graphql-codegen/typescript
npm install -D @graphql-codegen/typescript-operations
npm install -D @graphql-codegen/typescript-react-apollo

# codegen.ts
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'http://localhost:4000/graphql',
  documents: ['src/**/*.graphql', 'src/**/*.tsx'],
  generates: {
    './src/generated/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo'
      ],
      config: {
        withHooks: true,
        withComponent: false
      }
    }
  }
};

export default config;

# Run generation
npx graphql-codegen

# Usage - fully typed!
import { useGetUserQuery, useCreateUserMutation } from './generated/graphql';

function UserProfile({ userId }: { userId: string }) {
  const { data, loading } = useGetUserQuery({
    variables: { id: userId }  // Type-checked!
  });

  // data.user is fully typed
  return <div>{data?.user?.name}</div>;
}

### Error Handling with Unions

Expected errors as data, not exceptions

**When to use**: Operations that can fail in expected ways

# ERRORS AS DATA:

"""
Use union types for expected failure cases.
GraphQL errors are for unexpected failures.
"""

# Schema
type Mutation {
  login(email: String!, password: String!): LoginResult!
}

union LoginResult = LoginSuccess | InvalidCredentials | AccountLocked

type LoginSuccess {
  user: User!
  token: String!
}

type InvalidCredentials {
  message: String!
}

type AccountLocked {
  message: String!
  unlockAt: DateTime
}

# Resolver
const resolvers = {
  Mutation: {
    login: async (_, { email, password }, { db }) => {
      const user = await db.user.findByEmail(email);



> See [references/details.md](references/details.md) for extended content.
