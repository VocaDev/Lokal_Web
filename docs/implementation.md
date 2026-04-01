# Lab CRUD — Implementation Documentation

**Author:** Gentian Voca
**Module:** Academic CRUD Module (Lab)
**Stack:** Next.js · TypeScript · Node.js `fs` · CSV

---

## 1. Architecture Overview

This module implements a classic **layered CRUD architecture** that is fully independent from the main LokalWeb Supabase-based system.

```
┌─────────────┐     fetch()     ┌─────────────────┐
│   UI Page    │ ──────────────→ │   API Routes    │
│ /lab-crud    │ ←────────────── │ /api/lab-services│
└─────────────┘     JSON        └────────┬────────┘
                                         │ instantiates
                                         ▼
                                ┌─────────────────┐
                                │  ServiceService  │  ← Business Logic + Validation
                                │  (Service Layer) │
                                └────────┬────────┘
                                         │ constructor DI
                                         ▼
                                ┌─────────────────┐
                                │ServiceRepository │  ← File I/O (Node.js fs)
                                │(FileRepository)  │
                                └────────┬────────┘
                                         │ read/write
                                         ▼
                                ┌─────────────────┐
                                │  services.csv   │  ← Persistent Storage
                                │  (CSV File)     │
                                └─────────────────┘
```

**Data Flow:** UI → API → ServiceService → ServiceRepository → CSV

---

## 2. Layer Descriptions

### Layer 1 — Data Model (`lab-crud/models/Service.ts`)

Defines the `Service` interface with 5 attributes:

```typescript
export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
}
```

This model is independent from the Supabase `Service` type in `src/lib/types.ts`.

---

### Layer 2 — File Repository (`lab-crud/repositories/ServiceRepository.ts`)

Implements the **Repository Pattern** using Node.js `fs` module. All data is persisted to `lab-crud/data/services.csv`.

```typescript
export class ServiceRepository {
  constructor(filePath?: string) {
    /* defaults to lab-crud/data/services.csv */
  }

  getAll(): Service[]; // Parse CSV → array
  getById(id: string): Service | null; // Find by ID
  add(service: Service): void; // Append + save
  update(service: Service): void; // Find, replace, save
  delete(id: string): void; // Filter out + save
  save(services: Service[]): void; // Write entire array to CSV
}
```

**Key design decisions:**

- Manual CSV parsing (no external libraries)
- Handles quoted fields with commas
- Overwrites the entire file on each write (simple and reliable)

---

### Layer 3 — Service Layer (`lab-crud/services/ServiceService.ts`)

Implements **business logic and validation**. Receives the repository via **constructor injection** (Dependency Injection).

```typescript
export class ServiceService {
  constructor(private repo: ServiceRepository) {}

  list(filter?: string): Service[]; // Filter by name (case-insensitive)
  getById(id: string): Service | null;
  add(service: Service): void; // Validates, then delegates
  update(service: Service): void; // Validates, then delegates
  delete(id: string): void; // Delegates to repo
}
```

**Validation rules (enforced in `add` and `update`):**

- `name` must not be empty
- `price` must be greater than 0

```typescript
private validate(service: Service): void {
  if (!service.name || service.name.trim() === '') {
    throw new Error('Validation failed: name must not be empty');
  }
  if (service.price <= 0) {
    throw new Error('Validation failed: price must be greater than 0');
  }
}
```

---

### Layer 4 — API Routes (`app/api/lab-services/`)

Next.js Route Handlers that bridge the UI and the Service Layer.

| Method | Route                   | Action                            |
| ------ | ----------------------- | --------------------------------- |
| GET    | `/api/lab-services`     | List all (optional `?filter=...`) |
| POST   | `/api/lab-services`     | Add new service                   |
| PUT    | `/api/lab-services/:id` | Update existing service           |
| DELETE | `/api/lab-services/:id` | Delete service                    |

Each handler instantiates the full chain:

```typescript
function createService() {
  const repo = new ServiceRepository(); // FileRepository
  return new ServiceService(repo); // Injected via constructor
}
```

---

### Layer 5 — UI Page (`app/lab-crud/page.tsx`)

A React client component that provides:

- **Table view** of all services
- **Filter input** (filters by name)
- **Add form** (name, description, price, duration)
- **Edit button** per row (populates the form for editing)
- **Delete button** per row

The UI communicates **exclusively** via `fetch()` to `/api/lab-services`. It does **not** import `store.ts`, Supabase, or any existing data layer.

---

## 3. CSV Data File

Located at: `lab-crud/data/services.csv`

```csv
id,name,description,price,durationMinutes
1,Haircut,Standard men haircut,5,30
2,Beard Trim,Professional beard trimming and shaping,3,15
3,Full Package,Haircut and beard trim combo,8,45
4,Hair Wash,Shampoo and conditioning treatment,2,10
5,Kids Haircut,Haircut for children under 12,4,20
```

Pre-seeded with 5 records. This file is modified in-place when services are added, updated, or deleted.

---

## 4. Folder Structure

```
LokalWeb/
├── lab-crud/                              # Academic CRUD module (NEW)
│   ├── models/
│   │   └── Service.ts                     # Data model interface
│   ├── data/
│   │   └── services.csv                   # CSV storage file (5 records)
│   ├── repositories/
│   │   └── ServiceRepository.ts           # FileRepository (fs-based)
│   └── services/
│       └── ServiceService.ts              # Service layer (DI + validation)
│
├── app/
│   ├── api/lab-services/                  # API routes (NEW)
│   │   ├── route.ts                       # GET + POST
│   │   └── [id]/route.ts                  # PUT + DELETE
│   ├── lab-crud/                          # UI page (NEW)
│   │   └── page.tsx                       # React client component
│   └── ... (existing pages unchanged)
│
├── docs/
│   ├── implementation.md                  # This document (NEW)
│   └── architecture.md                    # Existing (unchanged)
│
└── src/                                   # Existing code (UNCHANGED)
    └── lib/
        ├── store.ts                       # Supabase store (NOT MODIFIED)
        └── types.ts                       # Supabase types (NOT MODIFIED)
```

---

## 5. How to Run

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Open the lab CRUD page:

   ```
   http://localhost:3000/lab-crud
   ```

3. Use the interface to:
   - View the pre-seeded services
   - Filter by name
   - Add a new service (validates name + price)
   - Edit an existing service
   - Delete a service

4. Verify CSV changes by opening:
   ```
   lab-crud/data/services.csv
   ```

---

## 6. Screenshots

### 🖥️ Services Table View

![Services Table](./screenshots/Sc1.png)

---

### ➕ Add New Service

![Add Service](./screenshots/Sc4.png)

---

### ✏️ Edit Service

![Edit Service](./screenshots/Sc3.png)

---

### 📄 CSV File After Changes

![CSV File](./screenshots/Sc2.png)

---

## 7. Dependency Injection Demonstration

The Service layer receives the Repository through its constructor — this is **constructor-based Dependency Injection**:

```typescript
// In the API route:
const repo = new ServiceRepository(); // Create the repository
const service = new ServiceService(repo); // Inject it into the service

// The service uses the injected repo for all data operations:
service.list(); // → calls repo.getAll()
service.add(item); // → validates, then calls repo.add(item)
service.update(item); // → validates, then calls repo.update(item)
service.delete(id); // → calls repo.delete(id)
```

This means the `ServiceService` doesn't know or care _how_ data is stored — it could be CSV, JSON, or a database. It only depends on the `ServiceRepository` interface.

