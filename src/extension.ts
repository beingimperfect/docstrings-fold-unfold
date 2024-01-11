import * as vscode from 'vscode';

class MyFoldingRangeProvider implements vscode.FoldingRangeProvider {
    private detectedRanges: { [key: string]: { lineStart: number; lineEnd: number }[] } = {};
	private decorationType: vscode.TextEditorDecorationType | undefined;
    private unfoldedIconPath: string;
    private foldedIconPath: string;

    constructor() {
		this.initializeDecorationType();
        this.unfoldedIconPath = this.getIconPath('chevron-up');
        this.foldedIconPath = this.getIconPath('chevron-down');
        // Register an event handler for document opening
        vscode.window.onDidChangeActiveTextEditor(this.onDocumentOpened, this);
    }

    provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.FoldingRange[] {
        // Check if ranges are already detected for this document
        const key = this.getDocumentKey(document);
        if (this.detectedRanges[key]) {
            return this.detectedRanges[key].map(({ lineStart, lineEnd }) => new vscode.FoldingRange(lineStart, lineEnd));
        }

        // If not, detect ranges and store them
        const ranges = MyFoldingRangeProvider.detectRanges(document);
        this.detectedRanges[key] = ranges;

        return ranges.map(({ lineStart, lineEnd }) => new vscode.FoldingRange(lineStart, lineEnd));
    }

    static detectRanges(document: vscode.TextDocument): { lineStart: number; lineEnd: number }[] {
        const ranges: { lineStart: number; lineEnd: number }[] = [];

        for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
            const line = document.lineAt(lineIndex);
            const lineText = line.text;

            // Check if the line contains triple double-quotes (""").
            if (lineText.includes('"""')) {
                // Find the range of the entire docstring block.
                const startLine = lineIndex;
                let endLine = lineIndex;

                while (++endLine < document.lineCount) {
                    const endLineText = document.lineAt(endLine).text;
                    if (endLineText.includes('"""')) {
                        break;
                    }
                }

                ranges.push({ lineStart: startLine, lineEnd: endLine - 1 });

                // Skip lines that are part of the docstring.
                lineIndex = endLine;
            }
        }

        return ranges;
    }

    private onDocumentOpened() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			console.log('Document NOt failed');
			return;
		}

		const document = editor.document;
        const key = this.getDocumentKey(document);
        this.detectedRanges[key] = MyFoldingRangeProvider.detectRanges(document);
        this.applyDecorations(document, this.detectedRanges[key]);
    }

    private applyDecorations(document: vscode.TextDocument, ranges: { lineStart: number; lineEnd: number }[]) {
        if (!this.decorationType) {
			console.log('Decoration failed');
            return;
        }
		// const editor = vscode.window.activeTextEditor;
		// if (!editor) {
		// 	return;
		// }

		// const document = editor.document;
		const range = MyFoldingRangeProvider.detectRanges(document);

        const decorations: vscode.DecorationOptions[] = range.map(({ lineStart, lineEnd }) => ({
            range: new vscode.Range(lineStart, 0, lineEnd, document.lineAt(lineEnd).text.length),
			renderOptions: {
                after: {
                    contentText: this.foldUnfoldIcon(true), // Use the ID of the ThemeIcon for contentText
                    color: new vscode.ThemeColor('editorGutter'),
                    margin: '0 0 0 2em' // Adjust margin as needed
                }
            }
        }));

		

        vscode.window.activeTextEditor?.setDecorations(this.decorationType, decorations);
    }

    private initializeDecorationType() {
        // Create a decoration type with your desired styles
        this.decorationType = vscode.window.createTextEditorDecorationType({
            isWholeLine: true,
            overviewRulerColor: 'rgba(255, 0, 0, 0.5)',
            overviewRulerLane: vscode.OverviewRulerLane.Left,
            light: {
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                color: 'rgba(255, 0, 0, 0.8)',
            },
            dark: {
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                color: 'rgba(255, 0, 0, 0.8)',
            }
        });
    }

    private getDocumentKey(document: vscode.TextDocument): string {
        // Create a unique key for each document (you can customize this logic)
        return document.uri.toString();
    }

    private getIconPath(iconName: string): string {
        // Customize this function based on the icon names you want to support
        switch (iconName) {
            case 'chevron-up':
                return 'M2 8l4-4 4 4 1-1-5-5-5 5z';
            case 'chevron-down':
                return 'M2 4l4 4 4-4 1 1-5 5-5-5z';
            default:
                return '';
        }
    }
	foldUnfoldIcon(isFolded: boolean): string {
        return isFolded ? this.unfoldedIconPath : this.foldedIconPath;
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "docstring-toggle" is now active!');

    // Register the FoldingRangeProvider
    const foldingProvider = new MyFoldingRangeProvider();
    context.subscriptions.push(vscode.languages.registerFoldingRangeProvider({ scheme: 'file', language: 'python' }, foldingProvider));

    let disposableFold = vscode.commands.registerCommand('docstring.fold', () => {
        foldSpecificRanges();
    });

    let disposableUnfold = vscode.commands.registerCommand('docstring.unfold', () => {
        unfoldSpecificRanges();
    });

    context.subscriptions.push(disposableFold, disposableUnfold);
}

function foldSpecificRanges() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const document = editor.document;
    const foldingRanges = MyFoldingRangeProvider.detectRanges(document);

    // Fold each specific range
    for (const { lineStart, lineEnd } of foldingRanges) {
        vscode.commands.executeCommand('editor.fold', {
            levels: 1,  // Optional: Specify the number of levels to fold (1 for basic folding)
            direction: 'up',  // Optional: Specify the folding direction
            selectionLines: [lineStart, lineEnd]  // Specify the range to fold
        });
    }
}

function unfoldSpecificRanges() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    const document = editor.document;
    const foldingRanges = MyFoldingRangeProvider.detectRanges(document);

    // Unfold each specific range
    for (const { lineStart, lineEnd } of foldingRanges) {
        vscode.commands.executeCommand('editor.unfold', {
            levels: 1,  // Optional: Specify the number of levels to unfold (1 for basic unfolding)
            selectionLines: [lineStart, lineEnd]  // Specify the range to unfold
        });
    }
}
