import { ConfigTransformer } from '@nativescript/config'
import { readFileSync } from "fs";
import { resolve } from 'path'

function readConfigStubContent(name) {
	const fileBuffer = readFileSync(resolve(__dirname, '__stubs__', name))
	return fileBuffer.toString()
}

describe('ConfigTransformer', () => {
	let config;
	const setupConfig = (name = 'default') => {
		config = new ConfigTransformer(readConfigStubContent(`config.${name}.ts.stub`))
	}

	afterEach(() => {
		expect(config.getFullText()).toMatchSnapshot()
	})

	it('writes string values', () => {
		setupConfig()
		expect(config.getValue('id')).toBe('org.nativescript.myApp')
		config.setValue('id', 'new.id')
		expect(config.getValue('id')).toBe('new.id')
	})

	it('writes nested string values', () => {
		setupConfig()
		expect(config.getValue('android.markingMode')).toBe('none')
		config.setValue('android.markingMode', 'changed')
		expect(config.getValue('android.markingMode')).toBe('changed')
	})

	it('writes deeply nested string values', () => {
		setupConfig()
		expect(config.getValue('android.deep.nested.value')).toBe('initial')
		config.setValue('android.deep.nested.value', 'changed')
		expect(config.getValue('android.deep.nested.value')).toBe('changed')
	})

	it('throws when there is no default export', () => {
		setupConfig('no-default-export')

		expect(() => {
			config.getDefaultExportValue()
		}).toThrow('Expected to find a default export symbol')
	});

	it('throws when the default export is not an object', () => {
		setupConfig('default-export-non-object')

		expect(() => {
			config.getDefaultExportValue()
		}).toThrow('default export must be an object!')
	});

	it('writes variable value', () => {
		setupConfig('with-variable-value')
		expect(config.getValue('id')).toBe('org.nativescript.myApp')
		config.setValue('id', 'new.id')
		expect(config.getValue('id')).toBe('new.id')
	})

	it('writes chained variable value', () => {
		setupConfig('with-variable-chain')
		expect(config.getValue('id')).toBe('org.nativescript.myApp')
		config.setValue('id', 'new.id')
		expect(config.getValue('id')).toBe('new.id')
	})

	it('throws if variable value is not supported', () => {
		setupConfig('with-variable-value-with-expression')

		expect(() => {
			config.getValue('id')
		}).toThrow('Unsupported value type: BinaryExpression')
	})

	it('throws if variable is not defined', () => {
		setupConfig('with-variable-value-with-expression')

		expect(() => {
			config.getValue('appResourcesPath')
		}).toThrow('Expected to find variable declaration named \'nonExistentVariable\'.')
	})

	it('writes boolean values', () => {
		setupConfig('with-boolean')
		expect(config.getValue('android.codeCache')).toBe(true)
		config.setValue('android.codeCache', false)
		expect(config.getValue('android.codeCache')).toBe(false)
	})

	it('writes numeric values', () => {
		setupConfig('with-number')
		expect(config.getValue('android.maxLogcatObjectSize')).toBe(500)
		config.setValue('android.maxLogcatObjectSize', 1000)
		expect(config.getValue('android.maxLogcatObjectSize')).toBe(1000)
	})

	it('works with module exports', () => {
		setupConfig('with-module-exports')
		expect(config.getValue('id')).toBe('org.nativescript.myApp')
		expect(config.getValue('android.codeCache')).toBe(true)
		expect(config.getValue('android.maxLogcatObjectSize')).toBe(500)
		expect(config.getValue('android.deep.nested.value')).toBe('initial')
		config.setValue('id', 'new.id')
		config.setValue('android.codeCache', false)
		config.setValue('android.maxLogcatObjectSize', 1000)
		config.setValue('android.deep.nested.value', 'changed')
		expect(config.getValue('id')).toBe('new.id')
		expect(config.getValue('android.codeCache')).toBe(false)
		expect(config.getValue('android.maxLogcatObjectSize')).toBe(1000)
		expect(config.getValue('android.deep.nested.value')).toBe('changed')
	})

	it('works with multiple module exports', () => {
		setupConfig('with-multiple-module-exports')
		expect(config.getValue('id')).toBe('org.nativescript.myApp')
		config.setValue('id', 'new.id')
		expect(config.getValue('id')).toBe('new.id')
	})

	it('can add a new property', () => {
		setupConfig()
		expect(config.getValue('nonExistent')).toBe(undefined)
		config.setValue('nonExistent', 'now it exists')
		expect(config.getValue('nonExistent')).toBe('now it exists')
	})

	it('can add a new nested property', () => {
		setupConfig()
		expect(config.getValue('android.nonExistent')).toBe(undefined)
		config.setValue('android.nonExistent', 'now it exists')
		expect(config.getValue('android.nonExistent')).toBe('now it exists')
	})

	it('can add a new nested property with new key', () => {
		setupConfig()
		expect(config.getValue('noParent.nonExistent')).toBe(undefined)
		config.setValue('noParent.nonExistent', 'now it exists')
		expect(config.getValue('noParent.nonExistent')).toBe('now it exists')
	})

	it('can add deeply nested property', () => {
		setupConfig('blank')
		expect(config.getValue('android.nonExistent.deep')).toBe(undefined)
		config.setValue('android.nonExistent.deep', 'now it exists deep')
		expect(config.getValue('android.nonExistent.deep')).toBe('now it exists deep')
	})

	it('can add deeply nested property to existing object', () => {
		setupConfig()
		expect(config.getValue('android.nonExistent.deep')).toBe(undefined)
		config.setValue('android.nonExistent.deep', 'now it exists deep')
		expect(config.getValue('android.nonExistent.deep')).toBe('now it exists deep')
	})

	it('can add deeply nested property to existing deeply nested object', () => {
		setupConfig()
		expect(config.getValue('android.deep.nested.nonExistent.deep')).toBe(undefined)
		config.setValue('android.deep.nested.nonExistent.deep', 'now it exists deep')
		expect(config.getValue('android.deep.nested.nonExistent.deep')).toBe('now it exists deep')
	})

	it('throws if we are trying to set a nested property on an existing string value', () => {
		setupConfig()
		expect(config.getValue('android.v8Flags.nested')).toBe(undefined)
		expect(() => {
			config.setValue('android.v8Flags.nested', 'now it exists deep')
		}).toThrow(`Could not add property 'nested'.`)
		expect(config.getValue('android.v8Flags.nested')).toBe(undefined)
	})
})
