// API URL Configuration - use relative paths to avoid CORS and host mismatch errors
const FLASK_API_URL = '';


// Global chart references
const charts = {
  batting: null,
  bowling: null,
  battingComparison: null,
  bowlingComparison: null
};

// DOM Elements
const elements = {
  sections: () => document.querySelectorAll('.section'),
  menuButtons: () => document.querySelectorAll('.menu-bar button'),
  trophySections: () => document.querySelectorAll('.trophy-section')
};

// Show selected section
function showSection(sectionId) {
  // Hide all sections
  elements.sections().forEach(section => {
    section.style.display = 'none';
  });

  // Show selected section
  const activeSection = document.getElementById(sectionId);
  if (activeSection) {
    activeSection.style.display = 'block';
  }

  // Update active button
  elements.menuButtons().forEach(button => {
    button.classList.remove('active');
    if (button.getAttribute('onclick')?.includes(sectionId)) {
      button.classList.add('active');
    }
  });

  // Initialize section-specific content
  switch (sectionId) {
    case 'batting':
      renderTopBattingGraph();
      break;
    case 'bowling':
      renderTopBowlingGraph();
      break;
    case 'trophy-bar':
      elements.trophySections().forEach(section => {
        section.style.display = 'none';
      });
      break;
  }
}

// Show trophy section
function showTrophySection(trophyId) {
  elements.trophySections().forEach(section => {
    section.style.display = 'none';
  });
  const trophySection = document.getElementById(trophyId);
  if (trophySection) {
    trophySection.style.display = 'block';
  }
}

// Chart rendering functions
function renderTopBattingGraph() {
  const ctx = document.getElementById('topBattingGraph')?.getContext('2d');
  if (!ctx) return;

  if (charts.batting) {
    charts.batting.destroy();
  }

  charts.batting = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: battingData.players,
      datasets: [{
        label: 'Runs',
        data: battingData.runs,
        backgroundColor: 'rgba(34, 197, 94, 0.75)',
        borderColor: '#22c55e',
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: getChartOptions('Runs')
  });
}

function renderTopBowlingGraph() {
  const ctx = document.getElementById('topBowlingGraph')?.getContext('2d');
  if (!ctx) return;

  if (charts.bowling) {
    charts.bowling.destroy();
  }

  charts.bowling = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: bowlingData.players,
      datasets: [{
        label: 'Wickets',
        data: bowlingData.wickets,
        backgroundColor: 'rgba(59, 130, 246, 0.75)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: getChartOptions('Wickets')
  });
}

function getChartOptions(metric) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } }
      },
      tooltip: {
        backgroundColor: '#1a1f2e',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: '#2e3550',
        borderWidth: 1,
        callbacks: {
          label: (context) => ` ${context.raw} ${metric}`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
        grid: { color: 'rgba(46,53,80,.5)' }
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
        grid: { color: 'rgba(46,53,80,.5)' }
      }
    }
  };
}

// Player comparison functions
async function fetchComparisonData(endpoint, player1, player2, attribute) {
  try {
    const response = await fetch(
      `${FLASK_API_URL}/odi/${endpoint}?player1=${encodeURIComponent(player1)}&player2=${encodeURIComponent(player2)}&attribute=${encodeURIComponent(attribute)}`
    );
    
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error in ${endpoint}:`, error);
    throw error;
  }
}

function renderComparisonChart(ctx, data, attribute, colors) {
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [data.player1.name, data.player2.name],
      datasets: [{
        label: attribute,
        data: [data.player1.value, data.player2.value],
        backgroundColor: colors.map(c => `${c}CC`),
        borderColor: colors,
        borderWidth: 1
      }]
    },
    options: getChartOptions(attribute.toLowerCase())
  });
}

async function comparePlayers(type) {
  const prefix = type === 'batting' ? 'batting' : 'bowling';
  const player1 = document.getElementById(`${prefix}-player1`).value;
  const player2 = document.getElementById(`${prefix}-player2`).value;
  const attribute = document.getElementById(`${prefix}-attribute`).value;

  if (!player1 || !player2 || !attribute) {
    alert(`Please select both ${type} players and an attribute.`);
    return;
  }

  try {
    const data = await fetchComparisonData(
      type === 'batting' ? 'compare_players' : 'compare_bowlers',
      player1,
      player2,
      attribute
    );

    if (data.error) {
      alert(data.error);
      return;
    }

    const ctx = document.getElementById(`${prefix}ComparisonGraph`)?.getContext('2d');
    if (!ctx) return;

    if (charts[`${prefix}Comparison`]) {
      charts[`${prefix}Comparison`].destroy();
    }

    const colors = type === 'batting' 
      ? ['rgba(211, 47, 47, 0.8)', 'rgba(25, 118, 210, 0.8)'] 
      : ['rgba(245, 124, 0, 0.8)', 'rgba(0, 121, 107, 0.8)'];

    charts[`${prefix}Comparison`] = renderComparisonChart(ctx, data, attribute, colors);
  } catch (error) {
    alert(`Error fetching ${type} comparison data.`);
  }
}

// Head-to-head prediction
async function predictHeadToHead() {
  const batsman = document.getElementById('batsman').value;
  const bowler = document.getElementById('bowler').value;

  if (!batsman || !bowler) {
    alert('Please select both a batsman and a bowler.');
    return;
  }

  try {
    const response = await fetch(
      `${FLASK_API_URL}/odi/head_to_head?batsman=${encodeURIComponent(batsman)}&bowler=${encodeURIComponent(bowler)}`
    );
    
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();

    const resultDiv = document.getElementById('head-to-head-result');
    if (!resultDiv) return;

    if (data.error) {
      resultDiv.innerHTML = `<p class="error">${data.error}</p>`;
    } else {
      resultDiv.innerHTML = `
        <div class="head-to-head-result">
          <h3>${data.batsman} vs ${data.bowler}</h3>
          <div class="stats-grid">
            <div><span>Fours:</span> ${data.fours}</div>
            <div><span>Sixes:</span> ${data.sixes}</div>
            <div><span>Wickets:</span> ${data.wickets}</div>
            <div><span>Average:</span> ${data.average.toFixed(2)}</div>
            <div><span>Strike Rate:</span> ${data.strike_rate.toFixed(2)}</div>
          </div>
          <div class="prediction">
            <strong>Predicted Winner:</strong> ${data.winner} (${data.confidence} confidence)
          </div>
        </div>
      `;
    }

    document.getElementById('head-to-head')?.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('Error predicting head-to-head:', error);
    alert('Error fetching prediction data.');
  }
}

// Bowler dropdown update
function updateBowlers() {
  const batsmanSelect = document.getElementById('batsman');
  const bowlerSelect = document.getElementById('bowler');
  const selectedBatsman = batsmanSelect?.value;

  if (!bowlerSelect || !selectedBatsman) return;

  bowlerSelect.innerHTML = '<option value="">Select Bowler</option>';

  const validBowlers = matchups
    .filter(matchup => matchup.Batsman === selectedBatsman)
    .map(matchup => ({
      name: matchup.Bowler,
      country: matchup.Bowler.split(' (')[1]?.replace(')', '') || ''
    }));

  validBowlers.forEach(bowler => {
    const option = document.createElement('option');
    option.value = bowler.name;
    option.textContent = bowler.name;
    option.dataset.country = bowler.country;
    bowlerSelect.appendChild(option);
  });
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize default section
  showSection('home');
  
  // Set up event listeners
  document.getElementById('batsman')?.addEventListener('change', updateBowlers);
  document.getElementById('compare-batting-btn')?.addEventListener('click', () => comparePlayers('batting'));
  document.getElementById('compare-bowling-btn')?.addEventListener('click', () => comparePlayers('bowling'));
  document.getElementById('predict-btn')?.addEventListener('click', predictHeadToHead);

  // Initialize bowlers dropdown if on head-to-head page
  if (document.getElementById('head-to-head')) {
    updateBowlers();
  }
});

// Global wrappers for inline HTML onclick handlers
function compareBattingPlayers() {
  comparePlayers('batting');
}

function compareBowlingPlayers() {
  comparePlayers('bowling');
}