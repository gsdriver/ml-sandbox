const fs = require('fs');
const moment = require('moment');

async function readFiles(dirname) {
  let files = [];

  return new Promise((resolve, reject) => {
    fs.readdir(dirname, async function(err, filenames) {
      if (err) {
        reject(err);
        return;
      }

      for (let i = 0; i < filenames.length; i++) {
        const filename = filenames[i];
        const fullPath = dirname + '/' + filename;

        if (fs.lstatSync(fullPath).isDirectory()) {
          const subfiles = await readFiles(fullPath);
          files = files.concat(subfiles);
        } else {
          const content = fs.readFileSync(fullPath, 'utf-8');
          files.push({
            name: fullPath,
            contents: JSON.parse(content),
          });
        }
      }

      resolve(files);
    });
  });
}

async function loadSessions() {
  // Read in every file and organize by user, then by session ID
  const files = await readFiles('amzn1.ask.skill.dcc3c959-8c93-4e9a-9cdf-ccdccd5733fd');
  const users = {};
  
  files.forEach((file) => {
    const path = file.name.split('/');
    const user = path[1];
    const session = path[2];

    users[user] = users[user] || {sessions: []};

    // Does this session already exist?
    let existingSession;
    for (let i = 0; i < users[user].sessions.length; i++) {
      if (users[user].sessions[i].id === session) {
        // Yes it does, use this one
        existingSession = i;
        break;
      }
    }

    const time = moment(file.contents.request.request.timestamp).valueOf();

    if (existingSession !== undefined) {
      users[user].sessions[existingSession].contents.push(file.contents);
      if (time < users[user].sessions[existingSession].start) {
        users[user].sessions[existingSession].start = time;
      }
      if (time > users[user].sessions[existingSession].end) {
        users[user].sessions[existingSession].end = time;
      }
    } else {
      // New session
      users[user].sessions.push({
        id: session,
        start: time,
        end: time,
        contents: [file.contents],
      });
    }
  });

  // Sort each session
  let spit;
  Object.keys(users).forEach((user) => {
    users[user].sessions.sort((a, b) => {
      if (a.start > b.start) {
        return -1;
      } else if (a.start < b.start) {
        return 1;
      } else {
        return 0;
      }
    });    
  });

  // Throw out users who didn't have their first session within the last 24 hours
  const cutoff = Date.now() - 24*60*60*1000;
  const newUsers = {};
  Object.keys(users).forEach((user) => {
    if (users[user].sessions[0].start < cutoff) {
      newUsers[user] = users[user];
    }
  });

  // Combine sessions where the start of a session is within 2 minutes of the end of the previous session
  Object.keys(newUsers).forEach((user) => {
    const newSessions = [newUsers[user].sessions[0]];
    for (let i = 1; i < newUsers[user].sessions.length; i++) {
      if ((newUsers[user].sessions[i - 1].end - newUsers[user].sessions[i].start) < 2*60*1000) {
        // Combine into previous session
        newSessions[newSessions.length - 1].contents = 
          newSessions[newSessions.length - 1].contents.concat(newUsers[user].sessions[i].contents);
      } else {
        newSessions.push(newUsers[user].sessions[i]);
      }
    }

    newUsers[user].sessions = newSessions;
  });

  // Now sort each individual interaction within each session
  Object.keys(newUsers).forEach((user) => {
    newUsers[user].sessions.forEach((session) => {
      session.contents.sort((a, b) => {
        const time1 = moment(a).valueOf();
        const time2 = moment(b).valueOf();

        if (time1 > time2) {
          return -1;
        } else if (time1 < time2) {
          return 1;
        } else {
          return 0;
        }
      });
    });
  });

  // And we're done!
  fs.writeFileSync('test.txt', JSON.stringify(newUsers));
  return newUsers;
}

async function getFeatures() {
  const users = await loadSessions();
  const features = {};
  const results = {};

  // Extract features
  // For now, let's focus just on the FIRST session (last in the array)
  Object.keys(users).forEach((user) => {
    const session = users[user].sessions[users[user].sessions.length - 1];
    features[user] = {};

    features[user].length = session.contents.length;

    // Calculate whether different games were played (boolean)

    // Extract wins and losses into an array
    const wins = [];
    session.contents.forEach((value) => {
      // Did the bankroll change in the request and response?
      if (value.request && value.request.session && value.request.session.attributes) {
        const bankrollIn = value.request.session.attributes.bankroll;
        const bankrollOut = value.response.sessionAttributes.bankroll;
        if (bankrollIn < bankrollOut) {
          wins.push(1);
        } else if (bankrollIn > bankrollOut) {
          wins.push(0);
        }
      }
    });

    // Note number of spins
    features[user].spins = wins.length;

    if (wins.length > 0) {
      // Calculate win ratio
      const sum = wins.reduce((a, b) => (a + b), 0);
      features[user].winRatio = (sum / wins.length);
      
      // Calculate longest win streak
      let curStreak = 0;
      let winStreak = 0;
      wins.forEach((win) => {
        curStreak = (win) ? (curStreak + 1) : 0;
        winStreak = Math.max(winStreak, curStreak);
      });
      features[user].winStreak = winStreak;

      // Calculate longest losing streak
      curStreak = 0;
      let loseStreak = 0;
      wins.forEach((win) => {
        curStreak = (win) ? 0 : (curStreak + 1);
        loseStreak = Math.max(loseStreak, curStreak);
      });
      features[user].loseStreak = loseStreak;
    } else {
      // Set these features to -1?
      features[user].winRatio = -1;
      features[user].winStreak = -1;
      features[user].loseStreak = -1;
    }
    console.log(wins);
    console.log(features[user]);

    // Determine whether someone returned in the next 24 hours
    if (users[user].sessions.length > 1) {
      const delta = users[user].sessions[users[user].sessions.length - 2].start - session.end;
      features[user].result = (delta < 24*60*60*1000) ? 1 : 0;
    } else {
      features[user].result = 0;
    } 
  });
  
  // Output our feature matrix and output vector
  return features;
}

getFeatures().then((features) => {
  console.log(features);

  // Create a features output file, then a results output file (vector)
  let matrix = '';
  Object.keys(features).forEach((user) => {
    const u = features[user];
    matrix += `${u.length},${u.spins},${u.winRatio},${u.winStreak},${u.loseStreak},${u.result}\n`;
  });

  fs.writeFileSync('matrix.txt', matrix);
});

// Have fun with ML!