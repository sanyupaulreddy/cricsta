from flask import Flask, render_template, request, jsonify
import pandas as pd
import pickle
import os
import logging
import warnings
from sklearn.exceptions import InconsistentVersionWarning

# Initialize logging and warnings
warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app with proper paths
app = Flask(__name__,
            template_folder=os.path.join(os.path.dirname(os.path.abspath(__file__)), '../Frontend'),
            static_folder=os.path.join(os.path.dirname(os.path.abspath(__file__)), '../Frontend'),
            static_url_path='/static')

# Load datasets
try:
    DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../Datasets')
    odi_batting_df = pd.read_csv(os.path.join(DATA_DIR, 'ODI data.csv'))
    odi_bowling_df = pd.read_csv(os.path.join(DATA_DIR, 'Bowling_ODI.csv'))
    odi_head_to_head_df = pd.read_csv(os.path.join(DATA_DIR, 'head_to_head_odi_50.csv'))
    logger.info("Datasets loaded successfully")
except Exception as e:
    logger.error(f"Error loading datasets: {e}")
    raise

# Data cleaning
for df in [odi_batting_df, odi_bowling_df, odi_head_to_head_df]:
    df.columns = [col.strip() for col in df.columns]
    df = df.loc[:, ~df.columns.str.contains('Unnamed')]

odi_batting_df["Player"] = odi_batting_df["Player"].str.strip().str.upper()
odi_bowling_df["Player"] = odi_bowling_df["Player"].str.strip().str.upper()
odi_head_to_head_df["Batsman"] = odi_head_to_head_df["Batsman"].str.strip().str.upper()
odi_head_to_head_df["Bowler"] = odi_head_to_head_df["Bowler"].str.strip().str.upper()

# Convert numeric columns
numeric_cols = {
    'batting': ["Mat", "Runs", "Ave", "SR", "100", "50"],
    'bowling': ["Mat", "Wkts", "Ave", "Econ", "SR", "4", "5"]
}

odi_batting_df[numeric_cols['batting']] = odi_batting_df[numeric_cols['batting']].apply(pd.to_numeric, errors="coerce")
odi_bowling_df[numeric_cols['bowling']] = odi_bowling_df[numeric_cols['bowling']].apply(pd.to_numeric, errors="coerce")

# Load ML models
try:
    MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(MODEL_DIR, 'head_to_head_model.pkl'), 'rb') as f:
        model = pickle.load(f)
    with open(os.path.join(MODEL_DIR, 'scaler.pkl'), 'rb') as f:
        scaler = pickle.load(f)
    logger.info("ML models loaded successfully")
except Exception as e:
    logger.error(f"Error loading ML models: {e}")
    raise

@app.route('/')
def index():
    try:
        # Prepare batting data
        top_batsmen = odi_batting_df.nlargest(10, 'Runs')[['Player', 'Mat', 'Runs', 'Ave', 'SR', '100', '50']]
        top_batsmen[['Runs', '100', '50']] = top_batsmen[['Runs', '100', '50']].astype(int)
        
        # Prepare bowling data
        top_bowlers = odi_bowling_df.nlargest(10, 'Wkts')[['Player', 'Mat', 'Wkts', 'Ave', 'Econ', 'SR', '4', '5']]
        top_bowlers[['Wkts', '4', '5']] = top_bowlers[['Wkts', '4', '5']].astype(int)

        return render_template('index.html',
            batting_table=top_batsmen.to_html(index=False, classes='table'),
            batting_data={
                'players': top_batsmen['Player'].tolist(),
                'runs': top_batsmen['Runs'].tolist()
            },
            bowling_table=top_bowlers.to_html(index=False, classes='table'),
            bowling_data={
                'players': top_bowlers['Player'].tolist(),
                'wickets': top_bowlers['Wkts'].tolist()
            },
            batting_players=odi_batting_df['Player'].unique().tolist(),
            bowling_players=odi_bowling_df['Player'].unique().tolist(),
            batsmen=odi_head_to_head_df['Batsman'].unique().tolist(),
            bowlers=odi_head_to_head_df['Bowler'].unique().tolist(),
            matchups=odi_head_to_head_df[['Batsman', 'Bowler']].to_dict(orient='records'))
    except Exception as e:
        logger.error(f"Error in index route: {e}")
        return render_template('error.html', error_message="Failed to load data"), 500

@app.route('/odi/head_to_head')
def head_to_head():
    try:
        batsman = request.args.get('batsman', '').strip().upper()
        bowler = request.args.get('bowler', '').strip().upper()
        
        if not batsman or not bowler:
            return jsonify({"error": "Both batsman and bowler are required"}), 400

        matchup = odi_head_to_head_df[
            (odi_head_to_head_df['Batsman'] == batsman) & 
            (odi_head_to_head_df['Bowler'] == bowler)
        ]
        
        if matchup.empty:
            return jsonify({"error": f"No data for {batsman} vs {bowler}"}), 404

        stats = matchup.iloc[0]
        input_data = [
            stats.get('Fours', 0),
            stats.get('Sixes', 0),
            stats.get('Wickets', 0),
            stats.get('Average', 0),
            stats.get('StrikeRate', 0)
        ]
        
        scaled_data = scaler.transform([input_data])
        prediction = model.predict(scaled_data)[0]
        probability = model.predict_proba(scaled_data)[0]
        
        return jsonify({
            "batsman": batsman,
            "bowler": bowler,
            "fours": int(stats.get('Fours', 0)),
            "sixes": int(stats.get('Sixes', 0)),
            "wickets": int(stats.get('Wickets', 0)),
            "average": float(stats.get('Average', 0)),
            "strike_rate": float(stats.get('StrikeRate', 0)),
            "winner": "Bowler" if prediction == 1 else "Batsman",
            "confidence": f"{probability[prediction] * 100:.2f}%"
        })
    except Exception as e:
        logger.error(f"Error in head_to_head: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/odi/compare_players')
def compare_players():
    try:
        player1 = request.args.get('player1', '').strip().upper()
        player2 = request.args.get('player2', '').strip().upper()
        attribute = request.args.get('attribute', '').strip()
        
        if not all([player1, player2, attribute]):
            return jsonify({"error": "Missing parameters"}), 400
            
        valid_attrs = ["Mat", "Runs", "Ave", "SR", "100", "50"]
        if attribute not in valid_attrs:
            return jsonify({"error": "Invalid attribute"}), 400
            
        p1_data = odi_batting_df[odi_batting_df["Player"] == player1]
        p2_data = odi_batting_df[odi_batting_df["Player"] == player2]
        
        if p1_data.empty or p2_data.empty:
            return jsonify({"error": "Player not found"}), 404
            
        return jsonify({
            "player1": {
                "name": p1_data["Player"].values[0],
                "value": float(p1_data[attribute].values[0]) if pd.notna(p1_data[attribute].values[0]) else 0
            },
            "player2": {
                "name": p2_data["Player"].values[0],
                "value": float(p2_data[attribute].values[0]) if pd.notna(p2_data[attribute].values[0]) else 0
            }
        })
    except Exception as e:
        logger.error(f"Error in compare_players: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/odi/compare_bowlers')
def compare_bowlers():
    try:
        player1 = request.args.get('player1', '').strip().upper()
        player2 = request.args.get('player2', '').strip().upper()
        attribute = request.args.get('attribute', '').strip()
        
        if not all([player1, player2, attribute]):
            return jsonify({"error": "Missing parameters"}), 400
            
        valid_attrs = ["Mat", "Wkts", "Ave", "Econ", "SR", "4", "5"]
        if attribute not in valid_attrs:
            return jsonify({"error": "Invalid attribute"}), 400
            
        p1_data = odi_bowling_df[odi_bowling_df["Player"] == player1]
        p2_data = odi_bowling_df[odi_bowling_df["Player"] == player2]
        
        if p1_data.empty or p2_data.empty:
            return jsonify({"error": "Player not found"}), 404
            
        return jsonify({
            "player1": {
                "name": p1_data["Player"].values[0],
                "value": float(p1_data[attribute].values[0]) if pd.notna(p1_data[attribute].values[0]) else 0
            },
            "player2": {
                "name": p2_data["Player"].values[0],
                "value": float(p2_data[attribute].values[0]) if pd.notna(p2_data[attribute].values[0]) else 0
            }
        })
    except Exception as e:
        logger.error(f"Error in compare_bowlers: {e}")
        return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    try:
        port = int(os.environ.get('PORT', 5000))
        app.run(host='0.0.0.0', port=port, debug=False)
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        raise