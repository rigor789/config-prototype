import * as ts from "typescript";
import ListFormat = ts.ListFormat;

function makeStuff(oldOpts: Object) {
	const factory = ts.factory

	const createObject = obj => {
		return Object.keys(obj).map(key => {
			const value = createValue(obj[key])
			return factory.createPropertyAssignment(key, value)
		})
	}

	const createValue = value => {
		if (typeof value === 'string') {
			return factory.createStringLiteral(value)
		} else if (typeof value === 'object') {
			return factory.createObjectLiteralExpression(createObject(value))
		}
	}

	const config = factory.createObjectLiteralExpression(createObject(oldOpts))


	const namedImports = factory.createNamedImports([
		factory.createImportSpecifier(
			undefined,
			factory.createIdentifier("NativeScriptConfig")
		)
	])

	const importConfigDeclaration = factory.createImportDeclaration(undefined, undefined,
		factory.createImportClause(false, undefined, namedImports),
		factory.createStringLiteral('@nativescript/core')
	)

	const configAs = factory.createAsExpression(config, factory.createTypeReferenceNode('NativeScriptConfig'))
	const statements = [
		importConfigDeclaration,
		factory.createExportDefault(
			configAs
		),
	]

	// const body = factory.createModuleBlock(statements)

	return factory.createNodeArray(statements)
	//return factory.createBlock(statements, true)
}

const resultFile = ts.createSourceFile(
	"nativescript.config.ts",
	"",
	ts.ScriptTarget.Latest,
	/*setParentNodes*/ false,
	ts.ScriptKind.TS
);
const printer = ts.createPrinter({
	newLine: ts.NewLineKind.LineFeed
});
const result = printer.printList(ListFormat.MultiLine, makeStuff({
	foo: 'bar',
	nested: {
		baz: 'true',
		deeper: {
			worksToo: 'i guess'
		}
	}
}), resultFile)

console.log(result);
