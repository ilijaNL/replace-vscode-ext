// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import axios from "axios";

async function postTranslation(key: string, initialTranslation: string) {
  return axios
    .post(
      "http://localhost:8082/v1/graphql",
      {
        query: `
	  mutation createTranslation($key: String!, $length: Int!, $nl: String) {
		  insert_translations_one(object:{
			key: $key,
			length:$length,
			nl_nl:$nl
		  }) {
			key
		  }
		}
		`,
        variables: {
          key: key,
          length: initialTranslation.length,
          nl: initialTranslation,
        },
      },
      {
        headers: {
          "x-hasura-admin-secret": "admin12345",
        },
      }
    )
    .then((d) => d.data);
}

type TTranslation = {
  key: string;
  nl_nl: string;
};

async function getTranslationByKey(key: string): Promise<TTranslation | null> {
  const response = await axios
    .post(
      "http://localhost:8082/v1/graphql",
      {
        query: `
		query getTranslationByKey($key: String!) {
			translation: translations_by_pk(key: $key) {
			  key,
			  nl_nl
			}
		  }
		`,
        variables: {
          key: key,
        },
      },
      {
        headers: {
          "x-hasura-admin-secret": "admin12345",
        },
      }
    )
    .then((d) => d.data);

  return response.data?.translation || null;
}

async function createTranslation() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return vscode.window.showErrorMessage("No editor window open");
  const selection = editor.selection;
  const text = editor.document.getText(selection);
  if (!text) return vscode.window.showErrorMessage("No text selected");

  // User Input to name Gist file
  const key = await vscode.window.showInputBox({
    placeHolder: "Specify key",
  });

  if (!key) return;

  const translation = await vscode.window.showInputBox({
    placeHolder: "Specify translation",
    value: text,
    prompt: "Geef initiële vertaling",
  });

  if (!translation) return;

  // check if translation exists
  const existingTranslation = await getTranslationByKey(key);

  // translation with this key and same nl translation already exist, just replace the user
  if (existingTranslation && existingTranslation.nl_nl === translation) {
    await editor.edit((newEditor) => {
      newEditor.replace(selection, `i18n.translate("${key}")`);
    });
    return vscode.window.showInformationMessage(
      `Replaced ${translation} with translation key "${key}"`
    );
  }

  if (existingTranslation && existingTranslation.nl_nl !== translation) {
    return vscode.window.showErrorMessage(
      `Key ${key} already exists with different translation`
    );
  }

  await editor.edit((newEditor) => {
    newEditor.replace(selection, `i18n.translate("${key}")`);
  });

  const result = await postTranslation(key, translation);

  console.log(result);

  vscode.window.showInformationMessage(
    `Replaced ${translation} with translation key "${key}"`
  );

  /* const options = {
    method: "POST",
    uri: "https://api.github.com/gists",
    headers: {
      "User-Agent": "Request-Promise"
    },
    body: {
      description: "the description for this gist",
      public: true,
      files: {}
    },
    json: true
  }; 

  options.body.files[gistName] = { content: text };

  rp(options).then(r => {
    const parsedUrl = vscode.Uri.parse(r.html_url);
    vscode.commands.executeCommand("vscode.open", parsedUrl);
  }); */
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "replace.translate",
    createTranslation
  );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
