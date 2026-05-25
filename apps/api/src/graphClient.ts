import { GraphQLClient, gql } from "graphql-request";

const SUBGRAPH_URL =
  process.env.SUBGRAPH_URL ||
  "http://localhost:8000/subgraphs/name/vael/somnia";

export const graphClient = new GraphQLClient(SUBGRAPH_URL);

// ── Queries ───────────────────────────────────────────────────────────────────

export const GET_AGENT = gql`
  query GetAgent($id: ID!) {
    agent(id: $id) {
      id
      owner
      agentType
      metadataURI
      createdAt
      blockNumber
      active
      totalActivities
      lastActivityAt
      passport {
        tokenId
        reputationScore
        totalActions
        issuedAt
        lastActivityAt
        verified
      }
    }
  }
`;

export const GET_AGENTS = gql`
  query GetAgents(
    $first: Int
    $skip: Int
    $where: Agent_filter
    $orderBy: Agent_orderBy
    $orderDirection: OrderDirection
  ) {
    agents(
      first: $first
      skip: $skip
      where: $where
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      owner
      agentType
      metadataURI
      createdAt
      active
      totalActivities
      lastActivityAt
      passport {
        tokenId
        reputationScore
        verified
      }
    }
  }
`;

export const GET_ACTIVITIES = gql`
  query GetActivities(
    $agentId: String!
    $first: Int
    $skip: Int
    $orderBy: Activity_orderBy
    $orderDirection: OrderDirection
  ) {
    activities(
      first: $first
      skip: $skip
      where: { agent: $agentId }
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      entryId
      action
      target
      timestamp
      blockNumber
      transactionHash
      conditionHash
    }
  }
`;

export const GET_REGISTRY_STATS = gql`
  query GetRegistryStats {
    registryStats(id: "global") {
      totalAgents
      totalActivities
      totalPassports
      lastUpdatedAt
    }
  }
`;

export const GET_LIVE_FEED = gql`
  query GetLiveFeed($first: Int) {
    agents(
      first: $first
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      owner
      agentType
      createdAt
      active
    }
    activities(
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      action
      timestamp
      agent {
        id
        agentType
      }
    }
  }
`;
