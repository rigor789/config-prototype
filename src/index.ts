import {
	BooleanLiteral,
	ExportAssignment,
	ExpressionStatement,
	Identifier,
	Node,
	NumericLiteral,
	ObjectLiteralElementLike,
	ObjectLiteralExpression,
	Project,
	PropertyAccessExpression,
	PropertyAssignment,
	ScriptKind,
	ShorthandPropertyAssignment,
	SourceFile,
	SpreadAssignment,
	StringLiteral,
	SyntaxKind
} from "ts-morph";

type SupportedConfigValues = string | number | boolean;

interface IConfigTransformer {

	/**
	 * Sets or updates the value at `path` and returns the updated content
	 * @param {string} path path to the property, supports dot notation.
	 * @param {SupportedConfigValues} value the value to set at `path`.
	 * @returns {string} the updated content
	 */
	setValue(path: string, value: SupportedConfigValues): string;
}

export class ConfigTransformer implements IConfigTransformer {
	private project: Project
	private config: SourceFile
	private readonly scriptKind: ScriptKind


	constructor(content: string) {
		this.project = new Project({
			compilerOptions: {
				allowJs: true,
			},

		});
		this.scriptKind = content.includes('module.exports') ? ScriptKind.JS : ScriptKind.TS
		this.config = this.project.createSourceFile('nativescript.config.ts', content, {
			scriptKind: this.scriptKind
		})
	}

	private getDefaultExportValue(): ObjectLiteralExpression {
		let exportValue;
		if (this.scriptKind === ScriptKind.JS) {
			this.config.getStatements().find(statement => {
				try {
					if (statement.getKind() === SyntaxKind.ExpressionStatement) {
						const expression = (statement as ExpressionStatement).getExpressionIfKind(SyntaxKind.BinaryExpression)
						const leftSide = expression.getLeft() as PropertyAccessExpression
						if (leftSide.getFullText().trim() === 'module.exports') {
							exportValue = expression.getRight()
							return true
						}
					}
				} catch (err) {
					return false
				}
			})
		} else {
			const exports = this.config.getDefaultExportSymbolOrThrow().getDeclarations()[0] as ExportAssignment
			const expr = exports.getExpression();
			exportValue = expr.getChildCount() > 0 ? expr.getChildAtIndex(0) as ObjectLiteralExpression : expr
		}

		if (!Node.isObjectLiteralExpression(exportValue)) {
			throw new Error('default export must be an object!')
		}

		return exportValue
	}

	private getProperty(key: string, parent: ObjectLiteralExpression = null): ObjectLiteralElementLike {
		if (key.includes('.')) {
			const parts = key.split('.')
			let property = this.getProperty(parts.shift())
			while (parts.length > 0) {
				const parent = property.getLastChildOrThrow((child) => {
					return Node.isObjectLiteralExpression(child)
				}) as ObjectLiteralExpression
				property = this.getProperty(parts.shift(), parent)
			}
			return property;
		}
		if (parent) {
			return parent.getProperty(key)
		}
		return this.getProperty(key, this.getDefaultExportValue())
	}

	private setInitializerValue(initializer, newValue) {
		if (Node.isStringLiteral(initializer)) {
			return (initializer as StringLiteral).setLiteralValue(newValue)
		}

		if (Node.isNumericLiteral(initializer)) {
			return (initializer as NumericLiteral).setLiteralValue(newValue)
		}

		if (Node.isBooleanLiteral(initializer)) {
			return (initializer as BooleanLiteral).setLiteralValue(newValue)
		}

		if (Node.isIdentifier(initializer)) {
			return this.setIdentifierValue(initializer as Identifier, newValue)
		}

		throw new Error('Unsupported value type: ' + initializer.getKindName())
	}

	private getInitializerValue(initializer) {
		if (Node.isStringLiteral(initializer)) {
			return (initializer as StringLiteral).getLiteralValue()
		}

		if (Node.isNumericLiteral(initializer)) {
			return (initializer as NumericLiteral).getLiteralValue()
		}

		if (Node.isBooleanLiteral(initializer)) {
			return (initializer as BooleanLiteral).getLiteralValue()
		}

		if (Node.isIdentifier(initializer)) {
			return this.getIdentifierValue(initializer as Identifier)
		}

		throw new Error('Unsupported value type: ' + initializer.getKindName())
	}

	private getIdentifierValue(identifier: Identifier) {
		const decl = this.config.getVariableDeclarationOrThrow(identifier.getText())
		const initializer = decl.getInitializerOrThrow()

		return this.getInitializerValue(initializer)
	}

	private setIdentifierValue(identifier: Identifier, newValue) {
		const decl = this.config.getVariableDeclarationOrThrow(identifier.getText())
		const initializer = decl.getInitializerOrThrow()

		this.setInitializerValue(initializer, newValue)
	}

	private getPropertyValue(objectProperty: ObjectLiteralElementLike) {
		let initializer
		if (objectProperty instanceof PropertyAssignment || objectProperty instanceof ShorthandPropertyAssignment) {
			initializer = objectProperty.getInitializer()
		} else if (objectProperty instanceof SpreadAssignment) {
			// todo: spread assignments?
			// initializer = objectProperty.get()
		} else {
			throw new Error('Unsupported value found.')
		}

		if (Node.isStringLiteral(initializer)) {
			return (initializer as StringLiteral).getLiteralValue()
		}

		if (Node.isNumericLiteral(initializer)) {
			return (initializer as NumericLiteral).getLiteralValue()
		}

		if (Node.isBooleanLiteral(initializer)) {
			return (initializer as BooleanLiteral).getLiteralValue()
		}

		if (Node.isIdentifier(initializer)) {
			return this.getIdentifierValue(initializer as Identifier)
		}
	}

	private setPropertyValue(objectProperty, newValue) {
		let initializer
		if (objectProperty instanceof PropertyAssignment || objectProperty instanceof ShorthandPropertyAssignment) {
			initializer = objectProperty.getInitializer()
		} else {
			throw new Error('Unsupported value found.')
		}

		this.setInitializerValue(initializer, newValue)
	}

	private getFullText() {
		return this.config.getFullText()
	}

	/**
	 * @internal
	 */
	getValue(key) {
		return this.getPropertyValue(this.getProperty(key))
	}

	public setValue(key: string, value: SupportedConfigValues): string {
		const property = this.getProperty(key);

		this.setPropertyValue(property, value)

		return this.getFullText()
	}
}
