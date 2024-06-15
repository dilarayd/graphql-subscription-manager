import { createSchema, createYoga, createPubSub } from 'graphql-yoga'
import { createServer } from 'node:http'
import { nanoid } from 'nanoid';
import { events, users, participants } from './data.js'

const pubsub = createPubSub();

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Subscription {
    userCreated: User!
    eventCreated: Event!
    participantAdded: Participant!
    },

    type Event {
    id:ID!
    title: String!
    desc: String!
    date: String!
    from: String!
    to: String!
    user_id:ID!
    user: User!
    participants: [Participant!]!
  }

  input AddEventInput{
    title: String!
    desc: String!
    date: String!
    from: String!
    to:String!
    user_id:ID!
  }

  type User {
    id: ID!
    username: String!
    email: String!
    events: [Event!]!
  }

  input AddUserInput {
    username: String!
    email: String!
  }

  type Participant {
    id: ID!
    user_id: ID!
    event_id: ID!
    user: User!
    username: String!
  }

  input AddParticipantInput{
    user_id:ID!
    event_id:ID!
  }

  type Query {
    events: [Event!]!
    event(id:ID!): Event!

    users: [User!]!
    user(id:ID!): User!

    participants: [Participant!]!
    participant(id:ID!): Participant!
  }

  type Mutation{
    addUser(data:AddUserInput!):User!
    addEvent(data:AddEventInput!): Event!
    addParticipant(data:AddParticipantInput!): Participant!
    
  },
  `,
  resolvers: {
    Subscription: {
      userCreated: {
        subscribe: () => pubsub.subscribe('USER_CREATED'),
        resolve: (payload) => payload,
      },
      eventCreated: {
        subscribe: () => pubsub.subscribe('EVENT_CREATED'),
        resolve: (payload) => payload,
      },
      participantAdded: {
        subscribe: () => pubsub.subscribe('PARTICIPANT_ADDED'),
        resolve: (payload) => payload,
      }
    },

    Mutation: {
      addUser: (parent, { data }) => {
        const user = {
          id: nanoid(),
          ...data,
        };
        users.push(user);
        pubsub.publish('USER_CREATED', user)
        return user;
      },
      addEvent: (parent, { data }) => {
        const event = {
          id: nanoid(),
          ...data,
        }
        events.push(event);
        pubsub.publish('EVENT_CREATED', event)
        return event;
      },
      addParticipant: (parent, { data }) => {
        const participant = {
          id: nanoid(),
          ...data
        }
        participants.push(participant);
        pubsub.publish('PARTICIPANT_ADDED', participant)
        return participant;
      },

    },
    Query: {
      events: () => events,
      event: (parent, args) => events.find((event) => event.id.toString() === args.id.toString()),

      users: () => users,
      user: (parent, args) => users.find((user) => user.id.toString() === args.id.toString()),

      participants: () => participants,
      participant: (parent, args) => participants.find((participant) => participant.id.toString() === args.id.toString()),
    },

    Event: {
      user: (parent, args) => users.find((user) => user.id.toString() === parent.user_id.toString()),
      participants: (parent, args) => participants.filter((participant) => participant.event_id.toString() === parent.id.toString())
    },

    User: {
      events: (parent, args) => events.filter((event) => event.user_id.toString() === parent.id.toString())
    },

    Participant: {
      user: (parent, args) => users.find((user) => user.id.toString() === parent.user_id.toString()),
      username: (parent, args) => {
        const user = users.find((user) => user.id.toString() === parent.user_id.toString());
        return user ? user.username : null;
      }
    }
  }
})

const yoga = createYoga({
  schema,
  context: {
    pubsub
  }
})
const server = createServer(yoga)
server.listen(4000, () => {
  console.info('Server is running on http://localhost:4000/graphql')
})