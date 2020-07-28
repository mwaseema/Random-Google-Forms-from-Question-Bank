function parseQuestionsAndReturn(row) {
    let statement = row[1],
        question_type = row[0];

    let question = {};

    question.statement = statement;
    question.question_type = question_type;

    return question;
}

function readSheet(sheetId) {
    let sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();

    let data = sheet.getDataRange().getValues();

    let parsedData = {};

    for (let i = 1; i < data.length; i++) {
        let row = data[i];

        // if question type is not already in the dictionary
        if (!(row[0] in parsedData)) {
            parsedData[row[0]] = [];
        }

        let question = parseQuestionsAndReturn(row);

        parsedData[row[0]].push(question);
    }

    return parsedData;
}

function randomSelection(questionsArray, limit) {
    Logger.log("randomSelection:questionsArray", questionsArray);

    let getRandomInt = function (min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    let uniqueNumbers = [];
    while (uniqueNumbers.length < limit) {
        let number = getRandomInt(0, questionsArray.length - 1);
        if (uniqueNumbers.indexOf(number) === -1) {
            uniqueNumbers.push(number);
        }
    }

    let newQuestions = [];
    for (let uniqueNumber of uniqueNumbers) {
        newQuestions.push(questionsArray[uniqueNumber]);
    }

    return newQuestions;
}

function randomQuestions(questions, perQuizLimit) {
    let new_questions = [];
    for (let question_type in perQuizLimit) {
        lim = perQuizLimit[question_type];
        Logger.log('randomQuestions:question_type', question_type);
        Logger.log('randomQuestions:questions', questions);
        ran_questions = randomSelection(questions[question_type], lim);
        new_questions.push(ran_questions);
    }

    let merged = [];
    for (let new_question of new_questions) {
        merged = merged.concat(new_question);
    }

    return merged;
}

function addRadioQuestionToForm(form, question) {
    let item = form.addMultipleChoiceItem();
    item.setTitle(question['statement']);

    let choices = [];
    for (let option of question['options']) {
        choices.push(item.createChoice(option['option'], option['correct']));
    }
    item.setChoices(choices);
}

function addPicQuestion(form, question, cnt, picsFolderId) {
    let item;

    // folder of the images
    let imagesFolder = DriveApp.getFolderById(picsFolderId);
    let img = imagesFolder.getFilesByName(question['statement']).next();

    item = form.addImageItem();
    item.setTitle(`Question Number ${cnt}`);
    item.setImage(img);

    //item.setTitle(question['statement']);
}

function addQuestionsToForm(form, questions, picsFolderId) {
    let cnt = 0;
    for (let question of questions) {
        cnt++;

        addPicQuestion(form, question, cnt, picsFolderId);
    }
}

function makeForm(user, destFolder, questions, perQuizLimit, picsFolderId) {
    let parsedRandomQuestions = randomQuestions(questions, perQuizLimit);

    let rollNumber = user.split("@")[0];
    let formTitle = `For ${rollNumber}`;
    let form = FormApp.create(formTitle);
    form.setTitle(formTitle);
    form.setCollectEmail(true);
    form.setIsQuiz(true);
    form.setAllowResponseEdits(false);
    form.setShuffleQuestions(false);

    addQuestionsToForm(form, parsedRandomQuestions, picsFolderId);

    formFile = DriveApp.getFileById(form.getId());
    destFolder.addFile(formFile);
    formFile.getParents().next().removeFile(formFile);

    return form.getPublishedUrl();
}

/***
 * Runs to make forms with images as question statements
 * @param outputFolderId Folder where generated forms will be stored
 * @param questionBankSheetId ID for the question bank Google Sheet
 * @param picsFolderId ID of folder where images for the questions are stored
 * @param users List of emails of end users
 */
function main(outputFolderId, questionBankSheetId, picsFolderId, users) {
    let perQuizLimit = {
        type1: 1,
        type2: 1,
        type3: 1,
        type4: 1,
        type5: 1,
        type6: 1,
        type7: 1,
        type8: 1,
        type9: 1,
        type10: 1,
        type11: 1,
        type12: 1,
        type13: 1,
    };

    let outputFolder = DriveApp.getFolderById(outputFolderId);
    let now = new Date();
    let destFolder = outputFolder.createFolder(now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate() + " " + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds());

    let questions = readSheet(questionBankSheetId);

    for (let user of users) {
        let formLink = makeForm(user, destFolder, questions, perQuizLimit, picsFolderId);

        let rollNumber = user.split('@')[0];
        MailApp.sendEmail(user, `Form for ${rollNumber}`, `Kindly access your form at: ${formLink}`);
    }
}