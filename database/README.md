# Database Setup

## Create database
createdb my_app_db

## Apply schema
psql my_app_db < schema.sql

## Seed admin user
psql my_app_db < seed.sql