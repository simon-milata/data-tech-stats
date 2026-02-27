# Data Tech Stats

**Live Demo:** https://dts.simonmilata.com/

A serverless app that collects, aggregates, and visualizes historical GitHub statistics for data-related repositories.
The project focuses on end-to-end API design, serverless architecture, and cost-constrained cloud deployment.

## Project goals

- Deploy a public-facing API using FastAPI and AWS API Gateway.
- Build an interactive frontend to visualize historical trends.
- Implement a simple but realistic data ingestion and aggregation pipeline.
- Keep the entire system free or as close to free as possible.
- Understand architectural tradeoffs in a small production system.

## High-level architecture
### ETL pipeline

(EventBridge → Lambda → GitHub APIs → S3 → aggregation Lambda → S3)

![dts-etl drawio](https://github.com/user-attachments/assets/69fecb86-f652-4429-9f51-b4614347ae2d)

- Scheduled Extract Lambda fetches GitHub data
- Raw snapshots are stored in S3 (partitioned by date)
- Scheduled Aggregation Lambda produces weekly / monthly datasets

### API architecture

(Client → Cloudflare DNS → CloudFront → API Gateway → Lambda → S3)

![dts-api drawio](https://github.com/user-attachments/assets/3a771662-f82c-4759-9bab-6c008207a098)

- FastAPI runs inside Lambda using Mangum
- API Gateway routes requests to API Lambda
- API Lambda reads pre-aggregated data from S3
- CloudFront caches responses to reduce latency and API calls

### Architecture Reasoning
- **Serverless (Lambda + API Gateway):** Chosen for scale-to-zero capabilities. With only tens of daily invocations, a dedicated server would sit 99% idle; Lambda incurs zero cost when inactive.
- **S3 as Data Store:** The "Write-Once-Read-Many" pattern makes S3 significantly cheaper ($0.023/GB) than maintaining a database.
- **CloudFront:** Caching responses at the edge reduces Lambda invocations and utilizes the Always Free 1TB transfer allowance, avoiding S3 data transfer fees.
- **Cloudflare DNS:** Used strictly to avoid the AWS Route 53 hosted zone fee ($0.50/mo), keeping fixed recurring costs at exactly $0.00.

## Cost Model & Predictions

- **Compute (Lambda):** Monthly usage is ~8,610 GB-s, which is <3% of the 400,000 GB-s free monthly allowance.
- **Storage (S3):** Accumulating ~1MB/day (raw snapshots + aggregates). Even as the dataset grows, the storage cost is estimated at <$0.02/month for the first few years.
- **Networking (CloudFront):** Utilizing the free 1TB per month data transfer allowance.
- **API Gateway:** At current volumes (~1,800 requests/month), the cost is estimated at <$0.002/month.
- **DNS:** Cloudflare. Used to bypass AWS Route 53 hosted zone fees ($0.50/mo), ensuring a total recurring cost of exactly $0.00.

## Tech stack
**Languages & Frameworks**

<img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white" />  <img src="https://img.shields.io/badge/FastAPI-005571?style=flat-square&logo=fastapi&logoColor=white" />  <img src="https://img.shields.io/badge/Pydantic-E92063?style=flat-square&logo=pydantic&logoColor=white" />  <img src="https://img.shields.io/badge/Pytest-0A9EDC?style=flat-square&logo=pytest&logoColor=white" />

**Data Engineering**

<img src="https://img.shields.io/badge/Boto3-FF9900?style=flat-square&logo=amazonaws&logoColor=white" />  <img src="https://img.shields.io/badge/Pandas-150458?style=flat-square&logo=pandas&logoColor=white" />  <img src="https://img.shields.io/badge/PyArrow-D55E5D?style=flat-square" />  <img src="https://img.shields.io/badge/Parquet-000000?style=flat-square" />

**AWS Infrastructure**

<img src="https://img.shields.io/badge/Lambda-FF9900?style=flat-square" />  <img src="https://img.shields.io/badge/S3-569A31?style=flat-square" />  <img src="https://img.shields.io/badge/API_Gateway-8C4FFF?style=flat-square" />  <img src="https://img.shields.io/badge/CloudFront-232F3E?style=flat-square" />  <img src="https://img.shields.io/badge/EventBridge-FF4F8B?style=flat-square" />

**DNS** 

<img src="https://img.shields.io/badge/Cloudflare-F38020?style=flat-square&logo=cloudflare&logoColor=white" />

## Scope & limitations

- Not designed for high write volume or real-time updates
- No database (by design)
- Focused on clarity and cost efficiency over scale
- Data collection began on deployment; historical trends are built moving forward.

## Frontend
This is a backend-centric project. I used AI to build the UI so I could focus entirely on the data engineering, serverless architecture, and API logic.

