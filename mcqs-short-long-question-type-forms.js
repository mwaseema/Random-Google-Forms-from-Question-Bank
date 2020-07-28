function parseAndReturnRadioQuestionFromSheet(row) {
    let question_type = row[0],
        statement = row[1],
        number_of_options = parseInt(row[2]);

    let options = []

    for (let i = 0; i < number_of_options; i++) {
        let option = row[3 + i];
        options.push(option);
    }

    let correctOption = parseInt(row[3 + number_of_options]) - 1;

    let radioQuestion = {};
    radioQuestion.statement = statement;
    radioQuestion.question_type = question_type;
    radioQuestion.options = [];

    for (let i = 0; i < options.length; i++) {
        let option = {'option': options[i], 'correct': false};
        // if iterated to correct option
        if (correctOption == i) {
            option.correct = true;
        }

        radioQuestion.options.push(option);
    }

    return radioQuestion;
}

function parseAndReturnShortLongQuestion(row) {
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

        let question = '';
        if (row[0] == 'radio') {
            question = parseAndReturnRadioQuestionFromSheet(row);
        } else if (row[0] == 'short_text' || row[0] == 'long_text') {
            question = parseAndReturnShortLongQuestion(row)
        }

        parsedData[row[0]].push(question);
    }

    return parsedData;
}

function randomSelection(questionsArray, limit) {
    let getRandomInt = function (min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    let uniqueNumbers = [];
    while (uniqueNumbers.length < limit) {
        let number = getRandomInt(0, questionsArray.length - 1);
        if (uniqueNumbers.indexOf(number) == -1) {
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
    let radioQuestions = randomSelection(questions['radio'], perQuizLimit['radio']);
    let shortTextQuestions = randomSelection(questions['short_text'], perQuizLimit['short_text']);
    let longTextQuestions = randomSelection(questions['long_text'], perQuizLimit['long_text']);

    let merged = [];
    merged = merged.concat(radioQuestions, shortTextQuestions, longTextQuestions);
    return merged;
}

function addRadioQuestionToForm(form, question) {
    let item = form.addMultipleChoiceItem();
    item.setTitle(question['statement'])

    let choices = [];
    for (let option of question['options']) {
        choices.push(item.createChoice(option['option'], option['correct']));
    }
    item.setChoices(choices);
}

function addShortLongTextQuestionToForm(form, question) {
    let item;

    if (question['question_type'] == 'short_text') {
        item = form.addTextItem();
    } else if (question['question_type'] == 'long_text') {
        item = form.addParagraphTextItem();
    }

    item.setTitle(question['statement']);
}

function addQuestionsToForm(form, questions) {
    for (let question of questions) {
        if (question['question_type'] == 'radio') {
            addRadioQuestionToForm(form, question);
        } else if (question['question_type'] == 'short_text' || question['question_type'] == 'long_text') {
            addShortLongTextQuestionToForm(form, question);
        }
    }
}

function makeForm(user, destFolder, questions, perQuizLimit) {
    let parsedRandomQuestions = randomQuestions(questions, perQuizLimit);
    Logger.log(parsedRandomQuestions);

    let rollNumber = user.split("@")[0];

    let formTitle = `For ${rollNumber}`;
    let form = FormApp.create(formTitle);
    form.setTitle(formTitle);
    form.setCollectEmail(true);
    form.setIsQuiz(true);
    form.setAllowResponseEdits(false);
    form.setShuffleQuestions(true);

    addQuestionsToForm(form, parsedRandomQuestions);

    formFile = DriveApp.getFileById(form.getId());
    destFolder.addFile(formFile);
    formFile.getParents().next().removeFile(formFile);

    return form.getPublishedUrl();
}

/***
 * Runs and generates forms taking questions randomly from question bank
 * @param outputFolderId ID of the folder on Google Drive
 * @param questionBankSheetId ID of the sheet from where data needs to be taken
 * @param users List containing user email addresses
 */
function main(outputFolderId, questionBankSheetId, users) {
    let perQuizLimit = {
        'radio': 3,
        'short_text': 2,
        'long_text': 1
    };

    let outputFolder = DriveApp.getFolderById(outputFolderId);
    let now = new Date();
    let destFolder = outputFolder.createFolder(now.getFullYear() + "-" + now.getMonth() + "-" + now.getDate() + " " + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds());

    let questions = readSheet(questionBankSheetId);

    for (let user of users) {
        let formLink = makeForm(user, destFolder, questions, perQuizLimit);

        let rollNumber = user.split('@')[0];
        MailApp.sendEmail(user, `Form for ${rollNumber}`, `Kindly access your form at: ${formLink}`);
    }
}