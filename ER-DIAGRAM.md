```mermaid
erDiagram
	CSR_USERS{
        int id PK
        string username
        string email "UNIQUE"
        string password_hash
        enum status "ACTIVE | DISABLED"
        datetime created_at
	}
	MOBILE_USERS{
		int id PK
		string first_name
		string last_name
		string email "UNIQUE"
		string phone
		enum status "ACTIVE | DISABLED"
		datetime created_at
        datetime last_updated
	}
	VEHICLES{
		int id PK
		int mobile_user_id FK
        string license_plate
        string state
        string make
        string model
        int year
        datetime created_at
	}
    PLANS{
        int id PK
        string name
        string description
        int price "cents"
        enum status "ACTIVE | DISABLED"
        datetime created_at
        datetime last_updated
    }
	PURCHASES{
		int id PK
        int mobile_user_id FK
        int vehicle_id FK
        int subscription_id FK "nullable"
		enum type "SUBSCRIPTION | SINGLE_WASH"
        enum status "SUCCESS | FAILURE | REFUNDED"
		int amount "cents"
        string description
        datetime created_at
	}
	SUBSCRIPTIONS{
		int id PK
		int vehicle_id FK
        int plan_id FK
        enum status "ACTIVE | OVERDUE | CANCELLED | TRANSFERRED"
        datetime next_billing_date
        datetime created_at
        datetime last_updated
	}
	
	MOBILE_USERS ||--o{ VEHICLES : "owns"
	MOBILE_USERS ||--o{ PURCHASES : "makes"
	VEHICLES ||--o{ SUBSCRIPTIONS : "subscribed to"
    PLANS ||--o{ SUBSCRIPTIONS : "tier of"
    VEHICLES ||--o{ PURCHASES : "charged for"
    SUBSCRIPTIONS |o--o{ PURCHASES : "billed by"
```

## Notes

### Rules not enforced by diagram:
- Vehicles being one to many is correct for the model, as many subscriptions may associate to a vehicle over time, but each vehicle may only have at most 1 ACTIVE or OVERDUE subscription. This is enforced in the service layer (after vehicles have been pulled). This is enforced via a partial unique index over subscriptions table, which will prevent racing create/transfer requests.
- CSR_USERS was added to support authentication and event logging. Table is orphaned right now, because event logging and authentication are out of scope.

### Out of Scope Improvements:
1. Subscriptions should insetead belong to mobile users, with a separate table on the edge determining which vehicle is assigned to which subscription, to maintain history.
2. Subscriptions should have an event history table.
3. Subscriptions status enum currently contains information that could be expressed better by nullable fields that provide additional information, such as a overdue_at field that shows the first failed payment for the subscription reducing the number of terminal statuses and simplifying the data model.
4. Subscriptions need a way to go into a PENDING state before being marked ACTIVE, which will await payment then on successful payment be marked ACTIVE

