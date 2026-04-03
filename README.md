# CO-PO Mapping System

A full-stack web application for managing course syllabi and generating CO-PO (Course Outcome - Program Outcome) mapping matrices.

## Features

- **Syllabus Management**: Input and manage course syllabus with units, topics, and learning outcomes
- **CO-PO Mapping Matrix**: Automatically calculates mapping between Course Outcomes and Program Outcomes
- **CO-PO Strength Matrix**: Determines strength of mapping based on percentage of classes
- **CO-PO Articulation Matrix**: Combines mapping and strength matrices
- **CO-PO-PSO Articulation Matrix**: Includes Program Specific Outcomes (PSO)
- **PO Averages**: Calculates average values for each Program Outcome

## Requirements

- Node.js (v14 or higher)
- npm or yarn
- Mistral AI API key (stored in `.env` file)

## Installation

1. Create a `.env` file in the root directory with your Mistral AI API key:
```
MISTRALAI_API_KEY=your_api_key_here
```

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd client
npm install
cd ..
```

Or install all at once:
```bash
npm run install-all
```

## Running the Application

### Development Mode

1. Start the backend server:
```bash
npm start
# or
npm run dev  # with nodemon for auto-restart
```

2. In a separate terminal, start the frontend:
```bash
npm run client
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Production Mode

1. Build the React app:
```bash
npm run build
```

2. Start the server:
```bash
npm start
```

The application will serve the built React app and API from http://localhost:5000

## Usage

### AI-Powered Syllabus Generator (Recommended)

1. Navigate to the "AI Generator" tab
2. Enter syllabus content for each unit in the text boxes
3. Click "Add Unit" to add more units (up to 5 units)
4. Click "Generate ILOs" to automatically:
   - Generate topic-wise ILOs (Intended Learning Outcomes) starting with action verbs
   - Allocate appropriate class hours (ensuring total ≤ 60 hours)
   - Map topics to relevant POs and PSOs
   - Distribute hours across units (10-15 hours per unit)
5. Review and edit the generated topics if needed
6. The system will automatically calculate all matrices

### Manual Syllabus Input

1. Navigate to the "Manual Input" tab
2. For each unit (up to 5 units):
   - Set total classes (10-15 per unit, max 60 total)
   - Add topics with:
     - Topic name (as a learning outcome statement)
     - Hours required
     - COs (Course Outcomes) - comma-separated, e.g., "CO1,CO2"
     - POs (Program Outcomes) - range notation, e.g., "PO1-PO4" or "PO1,PO2,PO3"
     - PSOs (Program Specific Outcomes) - optional, e.g., "PSO1,PSO2"

3. Click "Save Syllabus & Calculate Matrices"

### View Results

- **Syllabus Table**: View all topics in a structured table format
- **Matrices**: View all calculated matrices:
  - CO-PO Mapping Matrix: Shows hours mapped per unit
  - CO-PO Strength Matrix: Shows strength weights (1-3)
  - CO-PO Articulation Matrix: Combined mapping and strength
  - CO-PO-PSO Articulation Matrix: Includes PSOs
  - PO Averages: Average values for each PO

## Matrix Calculation Rules

### CO-PO Mapping Matrix
- Formula: (Sum of hours for topics mapped to CO-PO pair) / (Total classes in unit)
- Example: If 4 topics with 2 hours each map CO1 to PO1 in a 12-class unit: 8/12 = 0.67

### CO-PO Strength Matrix
- Weight 3: ≥70% of total classes mapped
- Weight 2: ≥50% and <70% of total classes mapped
- Weight 1: <50% of total classes mapped

### CO-PO Articulation Matrix
- Formula: Mapping Value × Strength Weight

### PO Averages
- Calculated vertically for each PO
- Average = Sum of articulation values / Number of COs participating

## Project Structure

```
copo_class/
├── server.js              # Express server entry point
├── routes/
│   ├── syllabus.js        # Syllabus API routes
│   └── matrices.js        # Matrix calculation routes
├── utils/
│   └── matrixCalculator.js # Matrix calculation logic
├── client/                # React frontend
│   ├── src/
│   │   ├── App.js
│   │   ├── components/
│   │   │   ├── SyllabusInput.js
│   │   │   ├── SyllabusTable.js
│   │   │   └── MatricesView.js
│   │   └── ...
│   └── package.json
└── package.json
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/syllabus` - Get syllabus data
- `POST /api/syllabus` - Save syllabus data
- `GET /api/syllabus/units/:unitNo` - Get specific unit
- `POST /api/matrices/calculate` - Calculate all matrices

## License

MIT
