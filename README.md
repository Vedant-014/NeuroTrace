\# NeuroTrace – AI-Based Parkinson's Disease Screening



NeuroTrace is an AI-assisted, image-based Parkinson's disease screening project designed to analyze drawing and handwriting patterns using computer vision and machine learning.



The project aims to explore how visual motor patterns can support early screening research through accessible image-based assessments.



> \*\*Important:\*\* NeuroTrace is an academic/research prototype. It is not a medical diagnostic device and must not replace professional medical evaluation.



\## Key Features



\- \*\*Spiral Drawing Analysis\*\* – Image-based analysis of spiral drawing patterns.

\- \*\*Wave Drawing Analysis\*\* – Analysis of wave-drawing patterns.

\- \*\*Handwriting Analysis\*\* – Image-based examination of handwriting characteristics.

\- \*\*Image Preprocessing\*\* – Image processing to prepare uploaded images for analysis.

\- \*\*AI/ML Analysis\*\* – CNN and classical machine-learning model components.

\- \*\*User Authentication\*\* – Account and authentication functionality.

\- \*\*Result Management\*\* – Backend support for assessment results and history.

\- \*\*Report and Email Services\*\* – Backend components for report generation and email delivery.



\*Feature availability depends on the configured frontend and backend implementation.\*



\## Technology Stack



| Component | Technologies |

|---|---|

| Frontend | React, Vite, Tailwind CSS |

| Backend | Python, FastAPI |

| Database | SQLite, SQLAlchemy |

| Machine Learning | TensorFlow/Keras, Scikit-learn |

| Image Processing | OpenCV |

| Authentication | JWT, Email OTP |

| API | REST API |



\## Project Architecture



```text

NeuroTrace/

│

├── neurotrace-frontend/

│   └── pd-frontend/

│       ├── src/

│       ├── public/

│       ├── package.json

│       └── vite.config.js

│

├── parkinsons-backend/

│   └── backend/

│       ├── app/

│       │   ├── core/

│       │   ├── routers/

│       │   ├── schemas/

│       │   ├── services/

│       │   └── main.py

│       │

│       ├── ml/

│       │   ├── features.py

│       │   ├── inference.py

│       │   ├── preprocessing.py

│       │   └── training scripts

│       │

│       ├── models/

│       ├── requirements.txt

│       └── .env.example

│

├── .gitignore

├── README.md

└── LICENSE

```



\## Machine Learning Models



The repository includes trained model artifacts:



\- `cnn\_handwriting.keras`

\- `classical\_handwriting.joblib`

\- `cnn\_handwriting\_history.json`



These artifacts are used by the machine-learning components of the project.



Model performance should be evaluated using appropriate independent datasets and validation procedures. Results should not be interpreted as clinical accuracy.



\## Installation and Setup



\### 1. Clone the repository



```bash

git clone https://github.com/Vedant-014/NeuroTrace.git

cd NeuroTrace

```



\### 2. Backend setup



```bash

cd parkinsons-backend/backend

python -m venv venv

```



Activate the environment on Windows:



```powershell

.\\venv\\Scripts\\Activate.ps1

```



Install dependencies:



```bash

pip install -r requirements.txt

```



Create your local environment file:



```powershell

Copy-Item .env.example .env

```



Edit `.env` and configure the required settings. Never commit real credentials.



Start the backend:



```bash

uvicorn app.main:app --reload --port 8000

```



Backend API documentation:



http://localhost:8000/docs



\### 3. Frontend setup



Open a second terminal:



```bash

cd neurotrace-frontend/pd-frontend

npm install

```



Configure the frontend API base URL in a local `.env` file:



```env

VITE\_API\_BASE=http://localhost:8000

```



Start the frontend:



```bash

npm run dev

```



Open the local Vite URL displayed in the terminal, usually:



http://localhost:5173



\## Environment Configuration



The backend `.env.example` provides configuration placeholders for:



\- Database connection

\- JWT authentication

\- Google OAuth

\- SMTP email configuration

\- CORS allowed origins

\- Frontend URL



Use your own credentials and secrets locally.



\## Privacy and Security



\- Environment files containing credentials are excluded from Git.

\- Local databases and user-generated uploads are excluded.

\- Virtual environments and dependency folders are excluded.

\- Do not upload patient-identifiable information or private datasets.



\## Medical Disclaimer



NeuroTrace is developed for educational and research purposes. It does not provide a confirmed diagnosis of Parkinson's disease. Any assessment result must be interpreted cautiously and should not be used to make medical decisions without consultation with a qualified healthcare professional.



\## Future Scope



\- Improved model validation and generalization.

\- Expanded handwriting and drawing datasets.

\- Explainable AI for model interpretation.

\- Further evaluation of screening and severity-assessment approaches.

\- Improved accessibility and deployment.



\## License



This project is licensed under the MIT License. See the `LICENSE` file for details.

&#x20;

\## Author



\*\*Vedant-014\*\*



GitHub: https://github.com/Vedant-014



Repository: https://github.com/Vedant-014/NeuroTrace

