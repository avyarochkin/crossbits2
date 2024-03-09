/*
We recommend eventually switching this configuration to extend from the recommended rule sets in typescript-eslint.
https://github.com/typescript-eslint/tslint-to-eslint-config/blob/master/docs/FAQs.md
*/
module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 5,
        "project": "tsconfig.json",
        "sourceType": "module",
        "ecmaFeatures": {
            "modules": true
        }
    },
    "plugins": [
        "@typescript-eslint",
        "@typescript-eslint/tslint"
    ],
    "root": true,
    "extends": [
        // "plugin:@typescript-eslint/eslint-recommended",
        // "plugin:@typescript-eslint/recommended"
    ],
    "rules": {
        "@typescript-eslint/array-type": "error",
        "@typescript-eslint/consistent-type-definitions": "error",
        "@typescript-eslint/explicit-member-accessibility": [
            "error",
            {
                "accessibility": "no-public"
            }
        ],
        "@typescript-eslint/indent": [
            "error",
            4,
            {
                "SwitchCase": 1,
                "CallExpression": { "arguments": "first" },
                "FunctionExpression": { "parameters": "first" },
                "FunctionDeclaration": { "parameters": "first" }
            }
        ],
        "@typescript-eslint/member-delimiter-style": [
            "error",
            {
                "multiline": {
                    "delimiter": "none",
                    "requireLast": true
                },
                "singleline": {
                    "delimiter": "semi",
                    "requireLast": false
                }
            }
        ],
        "@typescript-eslint/naming-convention": [
            "error",
            {
                "selector": "default",
                "format": ["camelCase"]
            },
            {
                "selector": "variable",
                "modifiers": ["global"],
                "format": ['UPPER_CASE'],
            },
            {
                "selector": ["enum", "enumMember"],
                "format": ["UPPER_CASE"]
            },
            {
                "selector": "typeLike",
                "format": ["PascalCase"]
            },
            {
                "selector": "objectLiteralProperty",
                "format": ["camelCase", "UPPER_CASE"]
            }
        ],
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-implied-eval": "error",
        "@typescript-eslint/no-inferrable-types": "error",
        "@typescript-eslint/no-misused-promises": "error",
        // "@typescript-eslint/no-unsafe-argument": "error", failing with exception
        "@typescript-eslint/no-unsafe-assignment": "error",
        "@typescript-eslint/no-unsafe-call": "error",
        "@typescript-eslint/no-unsafe-member-access": "error",
        "@typescript-eslint/no-unsafe-return": "error",
        "@typescript-eslint/no-unused-expressions": "error",
        "@typescript-eslint/no-unused-vars": "error",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/prefer-includes": "error",
        "@typescript-eslint/prefer-literal-enum-member": "error",
        "@typescript-eslint/prefer-nullish-coalescing": "error",
        "@typescript-eslint/prefer-optional-chain": "error",
        "@typescript-eslint/prefer-readonly": "error",
        "@typescript-eslint/quotes": [
            "error",
            "single",
            {
                "avoidEscape": true
            }
        ],
        "@typescript-eslint/semi": [
            "error",
            "never"
        ],
        "@typescript-eslint/strict-boolean-expressions": [
            "warn",
            {
                "allowNullableObject": true,
                "allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing": true
            }
        ],
        "block-scoped-var": "error",
        "block-spacing": ["error", "always"],
        "brace-style": ["error", "1tbs", { "allowSingleLine": true }],
        "curly": "error",
        "default-case": "error",
        "dot-notation": "error",
        "eqeqeq": [
            "error",
            "smart"
        ],
        "id-match": "error",
        "key-spacing": "error",
        "keyword-spacing": "error",
        "max-depth": ["error", 4],
        "max-len": [
            "error",
            120,
            {
                "ignoreComments": true
            }
        ],
        "no-cond-assign": "error",
        "no-console": "warn",
        "no-debugger": "error",
        "no-eval": "error",
        "no-extend-native": "error",
        "no-dupe-args": "error",
        "no-dupe-class-members": "error",
        // "no-dupe-else-if": "error", - not yet supported
        "no-dupe-keys": "error",
        "no-duplicate-case": "error",
        "no-duplicate-imports": "error",
        "no-implicit-coercion": "error",
        "no-fallthrough": "error",
        "no-invalid-this": "error",
        "no-irregular-whitespace": "error",
        "no-lonely-if": "error",
        "no-magic-numbers": [
            "warn",
            {
                ignore: [-1, 0, 1, 2]
            }
        ],
        "no-multi-assign": "error",
        "no-param-reassign": "warn",
        "no-redeclare": "error",
        "no-sequences": "error",
        "no-template-curly-in-string": "error",
        "no-underscore-dangle": "error",
        "no-unreachable": "error",
        "no-unused-expressions": "error",
        "no-unused-vars": "error",
        "no-use-before-define": "off",
        "no-var": "error",
        "object-curly-spacing": [
            "error",
            "always"
        ],
        "prefer-arrow-callback": "error",
        "prefer-const": "error",
        "prefer-object-spread": "error",
        "prefer-template": "error",
        "quotes": "off",
        "radix": "error",
        "require-atomic-updates": "error",
        "require-await": "error",
        "semi": "off",
        "@typescript-eslint/tslint/config": [
            "error",
            {
                "rules": {
                    "whitespace": [
                        true,
                        "check-branch",
                        "check-operator",
                        "check-typecast"
                    ]
                }
            }
        ]
    }
};
