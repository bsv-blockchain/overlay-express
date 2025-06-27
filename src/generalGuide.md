# How Topic Managers Work in Overlay Services  

## Overview  

A Topic Manager is a service that handles the registration and management of transactions (BEEF) with specific topics. It processes transaction submissions and associates them with relevant topics, making the data discoverable through these topic identifiers.

## Workflow  

Data Submission: Clients submit binary data (BEEF - Binary Envelope Encoding Format) to the Topic Manager via the /submit endpoint, along with topic identifiers.
Topic Association: The data is tagged with one or more topics specified in the x-topics header. These topics act as identifiers that enable searching and organizing the data.
On-Chain and Off-Chain Data: The system supports both on-chain data (the BEEF) and optional off-chain values. If off-chain values are included, they are separated from the main BEEF data.
BEEF Processing: The submitted BEEF represents a binary payload that follows the Binary Envelope Encoding Format specification. The Topic Manager processes this binary data and associates it with the specified topics.
STEAK Generation: Once the data is processed, the system generates a STEAK (Signed Token for Enabling Access and Knowledge), which serves as a receipt and reference to the submitted data.

## Technical Flow
The client sends a POST request to the /submit endpoint with:
The binary BEEF data in the request body
Topics specified in the x-topics header
Optional flag for off-chain values in x-includes-off-chain-values header
The Topic Manager creates a TaggedBEEF object containing:

```json
{
  beef: /* binary data */,
  topics: /* array of topic identifiers */,
  offChainValues: /* optional additional data */
}
```

The engine processes this TaggedBEEF and generates a STEAK, which is returned to the client.

## Use Cases

Data Discovery: By associating data with topics, clients can later discover relevant data by querying for specific topics.
Categorization: The topic system allows for logical organization of data across different categories.
Searchability: Topic Managers enable efficient searching and filtering of data based on topic identifiers.
Topic Managers essentially serve as intermediaries that help organize and index data in the overlay services ecosystem, making it easier to store, retrieve, and discover information based on meaningful topics.

The engine processes this TaggedBEEF and generates a STEAK, which is returned to the client.

## Use Cases

Data Discovery: By associating data with topics, clients can later discover relevant data by querying for specific topics.
Categorization: The topic system allows for logical organization of data across different categories.
Searchability: Topic Managers enable efficient searching and filtering of data based on topic identifiers.
Topic Managers essentially serve as intermediaries that help organize and index data in the overlay services ecosystem, making it easier to store, retrieve, and discover information based on meaningful topics.


# How Lookup Services Work in Overlay Services

## Overview

A Lookup Service is a component that enables data retrieval from the Overlay Services ecosystem. It allows clients to search and retrieve data (STEAK) that was previously submitted to Topic Managers, using specific criteria or identifiers.

## Workflow

1. **Data Querying**: Clients submit query parameters to the Lookup Service via the \`/lookup\` endpoint, specifying what data they want to retrieve.

2. **Data Retrieval**: The Lookup Service processes the query and searches for matching data across the system.

3. **Result Delivery**: The service returns any matching STEAKs (Signed Tokens for Enabling Access and Knowledge) to the client.

## Technical Flow

1. The client sends a POST request to the \`/lookup\` endpoint with query parameters in the request body. These parameters might include:
   - Topic identifiers to search for
   - Transaction identifiers (TXIDs)
   - Other search criteria specific to the implementation

2. The request flow:
```
Client Request → /lookup endpoint → engine.lookup() → Data Store → Response with matching STEAKs
```

3. The engine processes the lookup request by:
   - Parsing the query parameters
   - Searching the data store for matching records
   - Preparing the response with any found STEAKs

4. The results are returned to the client as JSON.

## Use Cases

- **Data Discovery**: Finding previously submitted data based on topics or other criteria.
- **Data Verification**: Verifying the existence and content of specific data in the system.
- **Service Integration**: Allowing other services to integrate with and leverage data in the Overlay Services ecosystem.
- **Historical Lookups**: Retrieving historical data that was previously submitted to Topic Managers.

## Integration with Topic Managers

Lookup Services complement Topic Managers in the Overlay Services ecosystem:

- **Topic Managers** handle the submission and organization of data with topics.
- **Lookup Services** enable retrieval of that data using those same topics or other identifiers.

Together, they form a complete system for data submission, organization, and retrieval within the Overlay Services framework.