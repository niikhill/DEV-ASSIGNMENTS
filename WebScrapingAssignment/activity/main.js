let request = require("request");
let cheerio = require("cheerio");
let fs = require("fs");
let path = require("path");
const {
    contains
} = require("cheerio");
const PDFDocument = require("pdfkit");
const iplFolderName = "IPL2020";
const baseUrl = "https://www.espncricinfo.com";
let url = "https://www.espncricinfo.com/series/ipl-2020-21-1210595";
const allMatchURL =
    "https://www.espncricinfo.com/series/ipl-2020-21-1210595/match-results";

function createiplDir() {
    if (fs.existsSync(iplFolderName) == false) {
        fs.mkdirSync(iplFolderName);
    }
}

function createDir(teamName) {
    let folderPath = path.join(__dirname, iplFolderName, teamName);
    if (fs.existsSync(folderPath) == false) {
        fs.mkdirSync(folderPath);
    }
}

function createJSON(teamName, batsmenName) {
    let filePath = path.join(
        __dirname,
        iplFolderName,
        teamName,
        batsmenName + ".json"
    );

    if (fs.existsSync(filePath) == false) {
        let file = fs.createWriteStream(filePath);
        file.end();
    }
}

request(url, function cb(err, response, html) {
    if (err) {
        console.log(err);
    } else {
        extractData(html);
        //createiplDir(iplFolderName);
    }
});

function extractData(html) {
    let selTool = cheerio.load(html);
    let navTopArr = selTool(".jsx-850418440.nav-item .nav-link");
    let teamTableLink = baseUrl + selTool(navTopArr[2]).attr("href");
    //console.log(baseUrl+teamTableLink)
    goToTeamNameLink(teamTableLink);
}

function goToTeamNameLink(teamTableLink) {
    request(teamTableLink, function cb(err, response, html) {
        if (err) {
            console.log(err);
        } else {
            extractTeamName(html);
        }
    });
}

function extractTeamName(html) {
    let selTool = cheerio.load(html);
    let teamNameArr = selTool(".header-title.label");
    createiplDir();
    for (let i = 1; i < teamNameArr.length; i++) {
        let tName = selTool(teamNameArr[i]).text();
        //console.log(tName);
        //createDir(path.join("./IPL2020", tName));
        extractMatchLinks(allMatchURL);
    }
}

function extractMatchLinks(allMatchURL) {
    request(allMatchURL, function cb(err, response, html) {
        if (err) {
            console.log(err);
        } else {
            extractMatchLinksData(html);
        }
    });
}

function extractMatchLinksData(html) {
    let selTool = cheerio.load(html);
    let MatchCardArr = selTool(".match-info-link-FIXTURES");
    for (let idx = 1; idx < MatchCardArr.length; idx++) {
        let MatchLink = baseUrl + selTool(MatchCardArr[idx]).attr("href");
        //console.log(MatchLink);
        requestEachMatchData(MatchLink);
    }
}

function requestEachMatchData(MatchLink) {
    request(MatchLink, function cb(err, response, html) {
        if (err) {
            console.log(err);
        } else {
            extractEachMatchData(html);
        }
    });
}

function fillJson(
    batsmanTeam,
    opponentTeam,
    batsmanName,
    currentTeam_batsmenRow,
    selTool
) {
    let batsmanRow = selTool(currentTeam_batsmenRow).find("td");
    let opponentName = opponentTeam;
    let runs = selTool(batsmanRow[2]).text();
    let balls = selTool(batsmanRow[3]).text();
    let fours = selTool(batsmanRow[5]).text();
    let sixes = selTool(batsmanRow[6]).text();
    let sr = selTool(batsmanRow[7]).text();
    let description = selTool(".match-info.match-info-MATCH .description")
        .text()
        .split(",");
    let date = description[2];
    let venue = description[1];
    let result = selTool(".match-info.match-info-MATCH .status-text").text();
    let objArr = [];
    let obj = {
        "My Team Name": batsmanTeam,
        "Opponent Team Name": opponentName,
        Runs: runs,
        Balls: balls,
        "4s": fours,
        "6s": sixes,
        SR: sr,
        Date: date,
        Venue: venue,
        Result: result,
    };
    objArr.push(obj);
    let file_path = path.join(
        __dirname,
        iplFolderName,
        batsmanTeam,
        batsmanName + ".json"
    );
    if (fs.existsSync(file_path) == false) {
        fs.writeFileSync(file_path, JSON.stringify(objArr));
    } else {
        let data = fs.readFileSync(file_path, "UTF-8");
        if (data.length == 0) {
            data = [];
        } else {
            // console.log(data);
            data = JSON.parse(data);
        }
        data.push(obj);
        fs.writeFileSync(file_path, JSON.stringify(data));
    }
}

function extractEachMatchData(html) {
    let selTool = cheerio.load(html);
    let bothTeams = selTool(".name-link .name");
    let team1_Name = selTool(bothTeams[0]).text();
    let team2_Name = selTool(bothTeams[1]).text();
    createDir(team1_Name);
    createDir(team2_Name);
    let playerLinkArr = selTool(".table.batsman");

    for (let i = 0; i < playerLinkArr.length; i++) {
        let batsmannameanchor = selTool(playerLinkArr[i]).find(
            "tbody tr .batsman-cell a"
        );
        for (let j = 0; j < batsmannameanchor.length; j++) {
            let batsmanName = selTool(batsmannameanchor[j]).text();
            createJSON(selTool(bothTeams[i]).text(), batsmanName);
            if (i == 0) {
                fillJson(
                    selTool(bothTeams[i]).text(),
                    selTool(bothTeams[1]).text(),
                    batsmanName,
                    batsmannameanchor[j],
                    selTool
                );
            } else {
                fillJson(
                    selTool(bothTeams[i]).text(),
                    selTool(bothTeams[0]).text(),
                    batsmanName,
                    batsmannameanchor[j],
                    selTool
                );
            }
        }
    }
}