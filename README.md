# Cricsta – Data Analytics Project

> A data-driven ODI Cricket Analytics web application built with Flask and Scikit-Learn.

## 🏏 Features
- **Top 10 Batting & Bowling Statistics** – Visualised with Chart.js bar charts
- **Player Comparison** – Compare any two batsmen or bowlers across key attributes
- **Head-to-Head Prediction** – ML model (trained on historical matchup data) predicts the winner between a batsman and bowler
- **Trophy Bar** – ICC World Cup & Champions Trophy winners at a glance
- **Clean Dark UI** – Modern dark theme with Inter font

## 🛠️ Tech Stack
| Layer | Technology |
|---|---|
| Backend | Python 3.10, Flask |
| Data | Pandas (ODI batting, bowling CSVs) |
| ML Model | Scikit-Learn (StandardScaler + Classifier) |
| Frontend | HTML5, Vanilla CSS, JavaScript, Chart.js |
| Fonts | Google Fonts – Inter |

## 📂 Project Structure
```
Cricsta_AD/
├── Datasets/
│   ├── ODI data.csv             # ODI batting statistics
│   ├── Bowling_ODI.csv          # ODI bowling statistics
│   └── head_to_head_odi_50.csv  # Head-to-head matchup data
├── Frontend/
│   ├── index.html               # ODI dashboard template
│   ├── select_format.html       # Format selection landing page
│   ├── error.html               # Error page
│   ├── styles.css               # Main stylesheet (dark theme)
│   ├── script.js                # Frontend logic & Chart.js
│   ├── world_cup.jpeg           # World Cup trophy image
│   └── champions_trophy.jpeg    # Champions Trophy image
└── Python/
    ├── app.py                   # Flask application
    ├── requirements.txt         # Python dependencies
    ├── head_to_head_model.pkl   # Pre-trained ML model
    └── scaler.pkl               # Feature scaler
```

## 🚀 Running Locally

### 1. Clone the repository
```bash
git clone https://github.com/sanyupaulreddy/CricSta_Data_Analytics_Project.git
cd CricSta_Data_Analytics_Project
```

### 2. Install dependencies
```bash
pip install -r Python/requirements.txt
# If you face a numpy binary incompatibility error, run:
pip install "numpy<2.0"
```

### 3. Start the Flask server
```bash
python Python/app.py
```

### 4. Open in browser
Navigate to **http://127.0.0.1:5000**

## 📡 API Endpoints
| Endpoint | Description |
|---|---|
| `GET /` | Format selection landing page |
| `GET /odi` | ODI statistics dashboard |
| `GET /odi/compare_players?player1=&player2=&attribute=` | Compare two batsmen |
| `GET /odi/compare_bowlers?player1=&player2=&attribute=` | Compare two bowlers |
| `GET /odi/head_to_head?batsman=&bowler=` | Predict head-to-head winner |

## 📊 Dataset
- **ODI Batting**: Career statistics for 2500+ batsmen (up to 2019)
- **ODI Bowling**: Career statistics for 2500+ bowlers (up to 2019)
- **Head-to-Head**: 45 curated high-profile batsman vs. bowler matchups
