// Global variables
let allData = [];
let teamAverages = {};
let currentFilter = 'all';
let currentRankings = []; 
let teamChartInstance = null; 
let leaderboardChartInstance = null;
let memberChartInstance = null;

// Global Chart settings to match premium aesthetic
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = "#64748b";

// 1. Navigation
function showPage(pageId, btnElement) {
    document.querySelectorAll('.page').forEach(page => page.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
    
    // Make the clicked tab look "active"
    if(btnElement) {
        document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }
}

// 2. AUTO-LOAD THE CSV FILE (No clicking required!)
window.onload = function() {
    Papa.parse("Consolidated.csv", {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            allData = results.data;
            setupFilters();
            calculateBiggestMover(); 
            processData();
        },
        error: function(err) {
            console.error("Error reading CSV:", err);
            document.getElementById('top-teams-list').innerHTML = "<p style='color: red;'>Could not load data. Is Consolidated.csv in the GitHub repository?</p>";
        }
    });
};

// 3. Setup the Dropdown 
function setupFilters() {
    let filterSelect = document.getElementById('time-filter');
    filterSelect.innerHTML = '<option value="all">All-Time (Overall)</option>';
    
    let phases = new Set();
    let weekMap = {};

    allData.forEach(row => {
        if (row["Phase"] !== undefined && row["Phase"] !== null) phases.add(String(row["Phase"]));
        if (row["Week"] !== undefined && row["Week"] !== null) {
            let weekStr = String(row["Week"]);
            let dateStr = row["Dates"] ? String(row["Dates"]) : "";
            weekMap[weekStr] = dateStr; 
        }
    });

    if (phases.size > 0) {
        let optgroup = document.createElement('optgroup');
        optgroup.label = "By Phase";
        let sortedPhases = Array.from(phases).sort((a, b) => a - b);
        sortedPhases.forEach(p => optgroup.innerHTML += `<option value="phase_${p}">Phase ${p}</option>`);
        filterSelect.appendChild(optgroup);
    }

    if (Object.keys(weekMap).length > 0) {
        let optgroup = document.createElement('optgroup');
        optgroup.label = "By Week";
        let sortedWeeks = Object.keys(weekMap).sort((a, b) => a - b);
        sortedWeeks.forEach(w => {
            let label = weekMap[w] ? `Week ${w} (${weekMap[w]})` : `Week ${w}`;
            optgroup.innerHTML += `<option value="week_${w}">${label}</option>`;
        });
        filterSelect.appendChild(optgroup);
    }

    document.getElementById('filter-container').style.display = 'inline-block';

    filterSelect.addEventListener('change', function(e) {
        currentFilter = e.target.value;
        processData();
        let selectedTeam = document.getElementById('team-selector').value;
        if (selectedTeam) showTeamDeepDive(selectedTeam);
    });
}

// 4. Calculate Biggest Mover
function calculateBiggestMover() {
    let weeks = [...new Set(allData.map(r => r["Week"]).filter(w => w !== null && w !== undefined))].sort((a,b)=>b-a);
    if (weeks.length < 2) return; 

    let latestWeek = weeks[0];
    let prevWeek = weeks[1];
    let teamWeeklyAvgs = {};

    allData.forEach(row => {
        let w = row["Week"];
        let t = row["Team"];
        let s = row["Average Weekly Step"] || 0;
        if (!t || (w !== latestWeek && w !== prevWeek)) return;

        if (!teamWeeklyAvgs[t]) teamWeeklyAvgs[t] = { latest: { sum: 0, count: 0 }, prev: { sum: 0, count: 0 } };
        
        if (w === latestWeek) {
            teamWeeklyAvgs[t].latest.sum += s;
            teamWeeklyAvgs[t].latest.count += 1;
        } else if (w === prevWeek) {
            teamWeeklyAvgs[t].prev.sum += s;
            teamWeeklyAvgs[t].prev.count += 1;
        }
    });

    let biggestJump = 0;
    let mostImprovedTeam = "";

    for (let team in teamWeeklyAvgs) {
        let data = teamWeeklyAvgs[team];
        if (data.latest.count > 0 && data.prev.count > 0) {
            let l_avg = data.latest.sum / data.latest.count;
            let p_avg = data.prev.sum / data.prev.count;
            let jump = l_avg - p_avg;
            
            if (jump > biggestJump) {
                biggestJump = jump;
                mostImprovedTeam = team;
            }
        }
    }

    if (mostImprovedTeam) {
        let container = document.getElementById('biggest-mover-container');
        container.innerHTML = `
            <div style="border-left: 4px solid var(--accent); padding: 16px; background: #f8fafc; text-align: left;">
                <p style="font-size: 0.75rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">🚀 Weekly Spotlight</p>
                <p style="color: var(--primary); font-size: 1.05rem;"><strong>${mostImprovedTeam}</strong> is the Most Improved Team (+${Math.round(biggestJump).toLocaleString()} steps from last week!)</p>
            </div>
        `;
        container.style.display = 'block';
    }
}

// 5. Calculate Epic Journey 
function calculateEpicJourney() {
    let totalSteps = 0;
    let uniqueWeeks = new Set();

    allData.forEach(row => {
        totalSteps += (row["Average Weekly Step"] || 0);
        if (row["Week"]) uniqueWeeks.add(row["Week"]);
    });

    if (totalSteps === 0 || uniqueWeeks.size === 0) return;

    let currentKm = totalSteps * 0.00076;
    let weeksCompleted = uniqueWeeks.size;
    let avgKmPerWeek = currentKm / weeksCompleted;
    let projectedFinalKm = avgKmPerWeek * 14; 

    const globalMilestones = [
        { name: "Cebu 🏝️", km: 570 },
        { name: "Bangkok 🐘", km: 2200 },
        { name: "Tokyo 🗼", km: 3000 },
        { name: "Sydney 🦘", km: 6200 },
        { name: "Paris 🥐", km: 10700 },
        { name: "New York 🗽", km: 13700 },
        { name: "Global RT 🌍", km: 40000 }
    ];

    let finalTarget = globalMilestones[globalMilestones.length - 1]; 
    for (let i = 0; i < globalMilestones.length; i++) {
        if (globalMilestones[i].km > projectedFinalKm) {
            finalTarget = globalMilestones[i];
            break;
        }
    }

    let milestonesToDisplay = globalMilestones.filter(m => m.km < finalTarget.km);
    let currentPercentage = Math.min((currentKm / finalTarget.km) * 100, 100);
    
    let html = `
        <p style="font-size: 0.8rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">🌍 The Grand Expedition</p>
        <p style="color: var(--text-muted); margin-bottom: 24px; font-size: 0.95rem;">
            At our current pace of <strong>${Math.round(avgKmPerWeek).toLocaleString()} km/week</strong>, we are projected to reach <strong>${finalTarget.name}</strong> by July 31!
        </p>

        <div style="position: relative; width: 100%; height: 28px; background: #e2e8f0; border-radius: var(--radius); overflow: hidden;">
            <div style="width: ${currentPercentage}%; height: 100%; background: linear-gradient(90deg, #1e3a8a, var(--accent)); display: flex; align-items: center; justify-content: flex-end; padding-right: 12px; color: white; font-weight: 600; font-size: 0.85rem; letter-spacing: 0.5px; transition: width 1s ease-in-out;">
                ${Math.round(currentKm).toLocaleString()} KM
            </div>
        </div>

        <div style="position: relative; width: 100%; height: 30px; margin-top: 8px;">
            <span style="position: absolute; left: 0%; transform: translateX(-50%); font-size: 0.75rem; font-weight: 600; color: var(--text-muted);">Manila 🇵🇭</span>
    `;

    milestonesToDisplay.forEach(m => {
        let mPercent = (m.km / finalTarget.km) * 100;
        let color = currentKm >= m.km ? 'var(--accent)' : '#cbd5e1'; 
        
        html += `
            <div style="position: absolute; left: ${mPercent}%; top: -42px; transform: translateX(-50%); text-align: center;">
                <div style="width: 1px; height: 35px; background: ${color}; margin: 0 auto;"></div>
                <span style="font-size: 0.7rem; font-weight: 700; color: ${color}; letter-spacing: 0.5px;">${m.name}</span>
            </div>
        `;
    });

    html += `
            <span style="position: absolute; right: 0%; transform: translateX(50%); font-size: 0.75rem; font-weight: 700; color: var(--primary);">🎯 ${finalTarget.name} (${finalTarget.km.toLocaleString()} KM)</span>
        </div>
    `;

    let container = document.getElementById('epic-journey-container');
    container.innerHTML = html;
    container.style.display = 'block';
}

// 6. Crunch Numbers (Now Includes Ops Team Category)
function processData() {
    teamAverages = {};
    let memberTotals = {};
    let memberCounts = {};
    let teamTotals = {};
    let teamCounts = {};
    
    // For Category tracking
    let opsTeamTotals = {};
    let opsTeamCounts = {};

    let filteredData = allData.filter(row => {
        if (currentFilter === 'all') return true;
        if (currentFilter.startsWith('phase_')) return String(row["Phase"]) === currentFilter.replace('phase_', '');
        if (currentFilter.startsWith('week_')) return String(row["Week"]) === currentFilter.replace('week_', '');
        return true;
    });

    filteredData.forEach(row => {
        let team = row["Team"];
        let member = row["Name"];
        let steps = row["Average Weekly Step"] || 0;
        let opsTeam = row["Ops Team"]; 
        
        if (!team || !member) return; 

        // Tally Members
        let memberKey = member + "|" + team;
        if (!memberTotals[memberKey]) { memberTotals[memberKey] = 0; memberCounts[memberKey] = 0; }
        memberTotals[memberKey] += steps;
        memberCounts[memberKey] += 1;

        // Tally Teams
        if (!teamTotals[team]) { teamTotals[team] = 0; teamCounts[team] = 0; }
        teamTotals[team] += steps;
        teamCounts[team] += 1;
        
        // Tally Ops Team Categories
        if (opsTeam) {
            if (!opsTeamTotals[opsTeam]) { opsTeamTotals[opsTeam] = 0; opsTeamCounts[opsTeam] = 0; }
            opsTeamTotals[opsTeam] += steps;
            opsTeamCounts[opsTeam] += 1;
        }
    });

    let teamList = [];
    for (let team in teamTotals) {
        let avg = Math.round(teamTotals[team] / teamCounts[team]);
        teamList.push({ name: team, avgSteps: avg });
        teamAverages[team] = avg; 
    }

    let memberList = [];
    for (let key in memberTotals) {
        let avg = Math.round(memberTotals[key] / memberCounts[key]);
        let [name, team] = key.split("|");
        memberList.push({ name: name, team: team, steps: avg });
    }
    
    let opsTeamList = [];
    for (let ot in opsTeamTotals) {
        let avg = Math.round(opsTeamTotals[ot] / opsTeamCounts[ot]);
        opsTeamList.push({ name: ot, avgSteps: avg });
    }

    teamList.sort((a, b) => b.avgSteps - a.avgSteps);
    memberList.sort((a, b) => b.steps - a.steps);
    opsTeamList.sort((a, b) => b.avgSteps - a.avgSteps);

    currentRankings = teamList; 

    let top5Teams = teamList.slice(0, 5);
    
    // Render the Dashboards
    displayLeaderboard(top5Teams, memberList.slice(0, 20)); // Grabbing Top 20 now
    displayCategoryLeaderboard(opsTeamList);
    populateTeamDropdown(teamList);
    
    calculateEpicJourney();
    renderLeaderboardChart(top5Teams);
}

// 7. Display Leaderboards
function displayLeaderboard(teams, members) {
    let filterSelect = document.getElementById('time-filter');
    let filterText = filterSelect.options[filterSelect.selectedIndex].text;
    
    document.getElementById('team-title').innerText = `🏆 Top 5 Teams (${filterText})`;
    document.getElementById('member-title').innerText = `👟 Top 20 Members (${filterText})`;

    let teamsHTML = '<ol style="padding-left: 0; list-style: none;">';
    teams.forEach((t, index) => {
        let color = index === 0 ? "var(--accent)" : "var(--primary)";
        teamsHTML += `<li>
                        <span style="display:flex; align-items:center;">
                            <span style="color: #94a3b8; width: 25px; font-size:0.8rem; font-weight:700;">0${index+1}</span>
                            <strong style="color: ${color};">${t.name}</strong>
                        </span>
                        <span style="font-weight: 500;">${t.avgSteps.toLocaleString()}</span>
                      </li>`;
    });
    teamsHTML += '</ol>';
    
    if (teams.length === 0) teamsHTML = '<p>No data available.</p>';
    document.getElementById('top-teams-list').innerHTML = teamsHTML;

    // Build the Top 20 Member List
    let membersHTML = '<ol style="padding-left: 0; list-style: none;">';
    members.forEach((m, index) => {
        let rankStr = index + 1 < 10 ? '0' + (index + 1) : index + 1;
        membersHTML += `<li>
                            <span style="display:flex; flex-direction:row; align-items: center;">
                                <span style="color: #94a3b8; width: 25px; font-size:0.8rem; font-weight:700;">${rankStr}</span>
                                <span style="display:flex; flex-direction:column;">
                                    <strong>${m.name}</strong> 
                                    <span style="font-size: 0.75rem; color: var(--text-muted); text-transform:uppercase;">${m.team}</span>
                                </span>
                            </span>
                            <span style="font-weight: 500;">${m.steps.toLocaleString()}</span>
                        </li>`;
    });
    membersHTML += '</ol>';
    
    if (members.length === 0) membersHTML = '<p>No data available.</p>';
    document.getElementById('top-members-list').innerHTML = membersHTML;
}

// 8. Display New Category List
function displayCategoryLeaderboard(opsTeams) {
    let filterSelect = document.getElementById('time-filter');
    let filterText = filterSelect.options[filterSelect.selectedIndex].text;
    
    document.getElementById('category-title').innerText = `🏢 Ops Team Leaderboard (${filterText})`;

    let html = '<ol style="padding-left: 0; list-style: none;">';
    opsTeams.forEach((t, index) => {
        let color = index === 0 ? "var(--accent)" : "var(--primary)";
        let rankStr = index + 1 < 10 ? '0' + (index + 1) : index + 1;
        html += `<li>
                    <span style="display:flex; align-items:center;">
                        <span style="color: #94a3b8; width: 25px; font-size:0.8rem; font-weight:700;">${rankStr}</span>
                        <strong style="color: ${color};">${t.name}</strong>
                    </span>
                    <span style="font-weight: 500;">${t.avgSteps.toLocaleString()}</span>
                  </li>`;
    });
    html += '</ol>';
    
    if (opsTeams.length === 0) html = '<p style="text-align:center;">No data available.</p>';
    document.getElementById('ops-team-list').innerHTML = html;
}

// 9. Render Top 5 Teams Chart
function renderLeaderboardChart(top5Teams) {
    if (currentFilter.startsWith('week_')) {
        document.getElementById('leaderboard-chart-container').style.display = 'none';
        return;
    }

    let topTeamNames = top5Teams.map(t => t.name);
    if (topTeamNames.length === 0) return;

    let teamDataByWeek = {}; 
    let allWeeks = new Set();
    
    topTeamNames.forEach(name => teamDataByWeek[name] = {});

    allData.forEach(row => {
        let team = row["Team"];
        if (topTeamNames.includes(team) && row["Week"]) {
            if (currentFilter.startsWith('phase_') && String(row["Phase"]) !== currentFilter.replace('phase_', '')) return;

            let w = row["Week"];
            allWeeks.add(w);
            if (!teamDataByWeek[team][w]) teamDataByWeek[team][w] = { sum: 0, count: 0 };
            teamDataByWeek[team][w].sum += (row["Average Weekly Step"] || 0);
            teamDataByWeek[team][w].count += 1;
        }
    });

    let sortedWeeks = Array.from(allWeeks).sort((a,b)=>a-b);
    let labels = ["Start"];
    sortedWeeks.forEach(w => labels.push("W" + w));

    let chartColors = ['#2563eb', '#0f172a', '#475569', '#38bdf8', '#94a3b8'];
    
    let datasets = topTeamNames.map((teamName, index) => {
        let dataPoints = sortedWeeks.map(w => {
            if (teamDataByWeek[teamName][w] && teamDataByWeek[teamName][w].count > 0) {
                return Math.round(teamDataByWeek[teamName][w].sum / teamDataByWeek[teamName][w].count);
            }
            return null; 
        });

        dataPoints.unshift(0);

        return {
            label: teamName,
            data: dataPoints,
            borderColor: chartColors[index % chartColors.length],
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.1, 
            pointRadius: 3,
            spanGaps: true 
        };
    });

    if (labels.length > 1) { 
        document.getElementById('leaderboard-chart-container').style.display = 'block';
        let ctx = document.getElementById('leaderboardChart').getContext('2d');

        if (leaderboardChartInstance) leaderboardChartInstance.destroy();

        leaderboardChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11, family: 'Inter' } } }
                },
                scales: { 
                    y: { beginAtZero: true, grid: { borderDash: [4, 4] } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

// 10. Setup Stats Dropdown
function populateTeamDropdown(teams) {
    let select = document.getElementById('team-selector');
    let currentSelection = select.value; 
    
    select.innerHTML = '<option value="">Select a team...</option>';
    let alphaTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));
    alphaTeams.forEach(t => select.innerHTML += `<option value="${t.name}">${t.name}</option>`);

    if (currentSelection) select.value = currentSelection; 

    if (!select.dataset.listenerAttached) {
        select.addEventListener('change', function(e) { showTeamDeepDive(e.target.value); });
        select.dataset.listenerAttached = true;
    }
}

// 11. Display Stats Data 
function showTeamDeepDive(teamName) {
    let container = document.getElementById('team-stats');
    document.getElementById('chart-container').style.display = 'none';
    document.getElementById('member-chart-container').style.display = 'none';

    if (!teamName) {
        container.innerHTML = '<p style="color: var(--text-muted);">Select a team from the dropdown to see their stats.</p>';
        return;
    }

    let teamAvg = teamAverages[teamName] || 0;
    let teamMembers = [];
    
    allData.forEach(row => {
        let isRightTeam = row["Team"] === teamName;
        let isRightTime = false;
        
        if (currentFilter === 'all') isRightTime = true;
        else if (currentFilter.startsWith('phase_')) isRightTime = String(row["Phase"]) === currentFilter.replace('phase_', '');
        else if (currentFilter.startsWith('week_')) isRightTime = String(row["Week"]) === currentFilter.replace('week_', '');
        
        if (isRightTeam && isRightTime) {
            let existing = teamMembers.find(m => m.name === row["Name"]);
            if (existing) {
                existing.totalSteps += (row["Average Weekly Step"] || 0);
                existing.count += 1;
            } else {
                teamMembers.push({ name: row["Name"], totalSteps: (row["Average Weekly Step"] || 0), count: 1 });
            }
        }
    });

    let totalTeamSum = 0;
    teamMembers.forEach(m => {
        m.avg = Math.round(m.totalSteps / m.count);
        totalTeamSum += m.avg;
    });
    
    teamMembers.sort((a, b) => b.avg - a.avg);

    let chaseText = "";
    let myRankIndex = currentRankings.findIndex(t => t.name === teamName);
    
    if (myRankIndex === 0) {
        chaseText = `<p style="font-size: 0.85rem; font-weight: 700; color: #f59e0b; letter-spacing: 1px; margin-bottom: 20px; text-transform: uppercase;">🥇 You are currently Rank #1! Keep it up!</p>`;
    } else if (myRankIndex > 0) {
        let teamAbove = currentRankings[myRankIndex - 1];
        let gap = teamAbove.avgSteps - teamAvg;
        chaseText = `<p style="font-size: 0.85rem; font-weight: 700; color: #dc2626; letter-spacing: 0.5px; margin-bottom: 20px; text-transform: uppercase; background: #fef2f2; border-left: 3px solid #dc2626; padding: 10px;">🎯 The Chase: <br><span style="font-weight:400; color: var(--text-main); font-size: 0.8rem; text-transform: none;">You only need <strong>${gap.toLocaleString()}</strong> more steps per person to beat <strong>${teamAbove.name}</strong> for Rank #${myRankIndex}!</span></p>`;
    }

    let localTeamLogo = `images/${teamName}.jpg`;
    let fallbackTeamLogo = `https://ui-avatars.com/api/?name=${teamName}&background=0f172a&color=fff&size=100`;

    let html = `
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <img src="${localTeamLogo}" onerror="this.onerror=null; this.src='${fallbackTeamLogo}'" style="width: 60px; height: 60px; border-radius: var(--radius); margin-right: 20px; object-fit: cover;">
            <div>
                <h3 style="font-size: 1.4rem; color: var(--primary); font-weight: 700;">${teamName}</h3>
                <p style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Overall Rank: 0${myRankIndex + 1}</p>
            </div>
        </div>
        ${chaseText}
        <div style="border: 1px solid var(--border); padding: 15px; border-radius: var(--radius); margin-bottom: 24px;">
            <p style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Team Average</p>
            <p style="font-size: 1.8rem; color: var(--accent); font-weight: 700; line-height: 1;">${teamAvg.toLocaleString()} <span style="font-size: 1rem; color: var(--primary); font-weight: 400;">steps</span></p>
        </div>
    `;
    
    html += `<h4 style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 12px;">Roster</h4><ul style="list-style: none;">`;
    
    if (teamMembers.length === 0) {
        html += `<li>No data available.</li>`;
    } else {
        teamMembers.forEach((m, index) => {
            let contribution = Math.round((m.avg / totalTeamSum) * 100) || 0;
            let isMVP = index === 0 ? "👑 " : "";
            let mvpColor = index === 0 ? "var(--accent)" : "var(--primary)";

            html += `<li>
                        <span style="display:flex; flex-direction:column;">
                            <strong style="color: ${mvpColor};">${isMVP}${m.name}</strong> 
                            <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">(${contribution}% of team total)</span>
                        </span>
                        <span style="font-weight: 500;">${m.avg.toLocaleString()}</span>
                     </li>`;
        });
    }
    html += '</ul>';

    container.innerHTML = html;
    
    renderDeepDiveChart(teamName);
    renderMemberChart(teamName);
}

// 12. Draw Stats Chart (Team Overall)
function renderDeepDiveChart(teamName) {
    if (currentFilter.startsWith('week_')) return; 

    let weekData = {};
    allData.forEach(row => {
        if (row["Team"] === teamName && row["Week"]) {
            if (currentFilter.startsWith('phase_') && String(row["Phase"]) !== currentFilter.replace('phase_', '')) return;

            let w = row["Week"];
            if (!weekData[w]) weekData[w] = { sum: 0, count: 0 };
            weekData[w].sum += (row["Average Weekly Step"] || 0);
            weekData[w].count += 1;
        }
    });

    let labels = ["Start"];
    let dataPoints = [0];

    Object.keys(weekData).sort((a,b)=>a-b).forEach(w => {
        labels.push("W" + w);
        dataPoints.push(Math.round(weekData[w].sum / weekData[w].count));
    });

    if (labels.length > 1) { 
        document.getElementById('chart-container').style.display = 'block';
        let ctx = document.getElementById('teamChart').getContext('2d');

        if (teamChartInstance) teamChartInstance.destroy();

        teamChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Team Average Steps',
                    data: dataPoints,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.05)',
                    borderWidth: 2,
                    tension: 0.1, 
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, grid: { borderDash: [4, 4] } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

// 13. Draw Stats Chart (Individual Members)
function renderMemberChart(teamName) {
    if (currentFilter.startsWith('week_')) return; 

    let memberDataByWeek = {};
    let allWeeks = new Set();
    let teamMembers = new Set();

    allData.forEach(row => {
        if (row["Team"] === teamName && row["Week"]) {
            if (currentFilter.startsWith('phase_') && String(row["Phase"]) !== currentFilter.replace('phase_', '')) return;

            let w = row["Week"];
            let member = row["Name"];
            if (!member) return;
            
            allWeeks.add(w);
            teamMembers.add(member);
            
            if (!memberDataByWeek[member]) memberDataByWeek[member] = {};
            if (!memberDataByWeek[member][w]) memberDataByWeek[member][w] = { sum: 0, count: 0 };
            
            memberDataByWeek[member][w].sum += (row["Average Weekly Step"] || 0);
            memberDataByWeek[member][w].count += 1;
        }
    });

    let sortedWeeks = Array.from(allWeeks).sort((a,b)=>a-b);
    let labels = ["Start"];
    sortedWeeks.forEach(w => labels.push("W" + w));

    let chartColors = ['#2563eb', '#0f172a', '#475569', '#38bdf8', '#94a3b8', '#dc2626', '#16a34a'];
    
    let datasets = Array.from(teamMembers).map((memberName, index) => {
        let dataPoints = sortedWeeks.map(w => {
            if (memberDataByWeek[memberName][w] && memberDataByWeek[memberName][w].count > 0) {
                return Math.round(memberDataByWeek[memberName][w].sum / memberDataByWeek[memberName][w].count);
            }
            return null; 
        });

        dataPoints.unshift(0); 

        return {
            label: memberName,
            data: dataPoints,
            borderColor: chartColors[index % chartColors.length],
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            tension: 0.1,
            pointRadius: 2,
            spanGaps: true 
        };
    });

    if (labels.length > 1) { 
        document.getElementById('member-chart-container').style.display = 'block';
        let ctx = document.getElementById('memberChart').getContext('2d');

        if (memberChartInstance) memberChartInstance.destroy();

        memberChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10, family: 'Inter' } } }
                },
                scales: { 
                    y: { beginAtZero: true, grid: { borderDash: [4, 4] } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}