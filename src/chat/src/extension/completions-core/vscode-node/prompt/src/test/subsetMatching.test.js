"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert_1 = __importDefault(require("assert"));
const similarFiles_1 = require("../snippetInclusion/similarFiles");
async function findAndScoreBlocks(referenceDoc, relatedFiles, useSubsetMatching) {
    const options = {
        snippetLength: similarFiles_1.defaultSimilarFilesOptions.snippetLength,
        threshold: similarFiles_1.defaultSimilarFilesOptions.threshold,
        maxTopSnippets: similarFiles_1.defaultSimilarFilesOptions.maxTopSnippets,
        maxCharPerFile: similarFiles_1.defaultSimilarFilesOptions.maxCharPerFile,
        maxNumberOfFiles: similarFiles_1.defaultSimilarFilesOptions.maxNumberOfFiles,
        maxSnippetsPerFile: similarFiles_1.defaultSimilarFilesOptions.maxSnippetsPerFile,
        useSubsetMatching,
    };
    return (0, similarFiles_1.getSimilarSnippets)(referenceDoc, relatedFiles, options);
}
function fileScore(snippets, partialFileName) {
    for (const snippet of snippets) {
        if (snippet.relativePath?.indexOf(partialFileName) !== -1) {
            return snippet.score;
        }
    }
    (0, assert_1.default)(false, 'Expected valid file name');
}
suite('Similar files with subset matching Test Suite', function () {
    /**
     * This test ensures that only tokens from the current method are used when
     * computing the score for a chunk.
     *
     * Compare this to @see FixedWindowSizeJaccardMatcher
     * which would use any tokens in the same 60-line-delimited chunk of code that
     * the caret fell in.
     *
     * Scenarios where the caret is in a sub-60-line methods or near a 60 line chunk
     * seam would end up getting results that are more related to the neighboring
     * methods.
     */
    test('Only current method is considered as part of reference tokens', async function () {
        const file0 = `
		public static class TestClass
		{
			public static void UnrelatedMethod(IBar bar)
			{
				var thing = UnrelatedThing();
				thing.DistractingMethodName();
			}

			public static void Foo(IBar bar)
			{
				var service = bar.GetService(typeof(IBaz));

				service.DoTheThing();
				|
			}

			public static void UnrelatedMethod2(IBar bar)
			{
				// This method is unrelated but can DoTheThing to a service
			}
		}
		`;
        const file1 = `
		public interface IBar
		{
			public object GetService(Type type);
		}
		`;
        const file2 = `
		public interface IBaz
		{
			public static void DoTheThing();
		}
		`;
        const file3 = `
		public static class DistractionClass
		{
			public DistractionClass UnrelatedThing()
			{
				TestClass.UnrelatedMethod(null);

				UnrelatedMethod(null);
			}

			public void DistractingMethodName()
			{
				TestClass.UnrelatedMethod2(null);
			}
		}
		`;
        // **********************************************************
        // Score with the old 60-line-delimited reference token chunk.
        const oldScores = await findAndScoreBlocks({ source: file0, uri: 'file:///home/user/file0.js', languageId: 'csharp', offset: file0.indexOf('|') }, [
            { source: file1, uri: 'file:///home/user/file1.js', relativePath: 'file1' },
            { source: file2, uri: 'file:///home/user/file2.js', relativePath: 'file2' },
            { source: file3, uri: 'file:///home/user/file3.js', relativePath: 'file3' },
        ], false);
        // We expect the old way to prefer the distraction class, which has lots of terms that look like stuff from
        // the neighboring methods.
        (0, assert_1.default)(fileScore(oldScores, 'file3') > fileScore(oldScores, 'file2') &&
            fileScore(oldScores, 'file2') > fileScore(oldScores, 'file1'), 'Expected 60-line-delimited reference chunks to prefer the distraction class because it resembles neighboring methods');
        // **********************************************************
        // **********************************************************
        // Score with the new subset matching mechanism.
        const newScores = await findAndScoreBlocks({ source: file0, uri: 'file:///home/user/file0.js', languageId: 'csharp', offset: file0.indexOf('|') }, [
            { source: file1, uri: 'file:///home/user/file1.js', relativePath: 'file1' },
            { source: file2, uri: 'file:///home/user/file2.js', relativePath: 'file2' },
            { source: file3, uri: 'file:///home/user/file3.js', relativePath: 'file3' },
        ], true);
        // We expect the new way to prefer the second file because it contains the most tokens that match
        // the method enclosing the caret.
        (0, assert_1.default)(fileScore(newScores, 'file2') > fileScore(newScores, 'file1') &&
            fileScore(newScores, 'file1') > fileScore(newScores, 'file3'), 'Expected that the file containing IBaz interface would be the best match');
        // **********************************************************
    });
    /**
     * This test ensures that methods are matched only based on the tokens from the reference
     * chunk that they do contain and are not penalized for containing additional tokens that
     * don't appear in the reference set.
     *
     * Compare this to @see FixedWindowSizeJaccardMatcher which would use Jaccard similarity to
     * score. Jaccard similarity gives preferences to chunks with sets of identical tokens.
     *
     * Intuitively, scenarios where a token is a type or method reference get penalized because
     * they have tokens in common for the name of the method but have divergent content.
     */
    test('Methods are not penalized for being supersets of the reference chunk', async function () {
        const file0 = `
			public static class TestClass
			{
				public static void Foo(Bar bar)
				{
					bar.Baz();
					|
				}
			}
			`;
        const file1 = `
			public class Bar
			{
				public void Baz()
				{
					// This method has a bunch of extra tokens that don't match file0 and collectively
					// reduce its score relative to the other files.
				}
			}
			`;
        const file2 = `
			public class Bar2
			{
				public void Baz()
				{
				}
			}
			`;
        const file3 = `
			public class Bar3
			{
				public void Baz3()
				{
				}
			}
			`;
        // **********************************************************
        // Score with the old 60-line-delimited reference token chunk.
        const oldScores = await findAndScoreBlocks({ source: file0, uri: 'file:///home/user/file0.js', languageId: 'csharp', offset: file0.indexOf('|') }, [
            { source: file1, uri: 'file:///home/user/file1.js', relativePath: 'file1' },
            { source: file2, uri: 'file:///home/user/file2.js', relativePath: 'file2' },
            { source: file3, uri: 'file:///home/user/file3.js', relativePath: 'file3' },
        ], false);
        // We expect the old way to prefer the simpler code samples, even when they match fewer tokens,
        // because there are fewer non-matching additional tokens.
        (0, assert_1.default)(fileScore(oldScores, 'file2') > fileScore(oldScores, 'file1') &&
            fileScore(oldScores, 'file1') === fileScore(oldScores, 'file3'), 'Expected 60-line-delimited reference chunks to prefer the distraction class because it resembles neighboring methods');
        // **********************************************************
        // **********************************************************
        // Score with the new method.
        const newScores = await findAndScoreBlocks({ source: file0, uri: 'file:///home/user/file0.js', languageId: 'csharp', offset: file0.indexOf('|') }, [
            { source: file1, uri: 'file:///home/user/file1.js', relativePath: 'file1' },
            { source: file2, uri: 'file:///home/user/file2.js', relativePath: 'file2' },
            { source: file3, uri: 'file:///home/user/file3.js', relativePath: 'file3' },
        ], true);
        // We expect the new way to prefer the file with matching class and method names because we're no longer
        // penalizing samples for having different tokens.
        (0, assert_1.default)(fileScore(newScores, 'file1') > fileScore(newScores, 'file2') &&
            fileScore(newScores, 'file2') > fileScore(newScores, 'file3'), 'Expected subset matching method to prefer the file with the most token matches');
        // **********************************************************
    });
    /**
     * This test ensures that only tokens from the current class are used when
     * computing the score for a chunk.
     *
     * Compare this to @see FixedWindowSizeJaccardMatcher
     * which would use any tokens in the same 60-line-delimited chunk of code that
     * the caret fell in.
     *
     * Scenarios where the caret is in a sub-60-line method or near a 60 line chunk
     * seam would end up getting results that are more related to the neighboring
     * methods.
     */
    test('Only current class is considered as part of reference tokens', async function () {
        const file0 = `

		public static class TestClass2
		{
			public static void UnrelatedMethod(IBar bar)
			{
				var thing = UnrelatedThing();
				thing.DistractingMethodName();
			}
		}

		public static class TestClass
		{
			public static void Foo(IBar bar)
			{
				var service = bar.GetService(typeof(IBaz));

				service.DoTheThing();
			}

			|
		}

		public static class TestClass3
		{
			public static void UnrelatedMethod2(IBar bar)
			{
				// This method is unrelated but can DoTheThing to a service
			}
		}
		`;
        const file1 = `
		public interface IBar
		{
			public object GetService(Type type);
		}
		`;
        const file2 = `
		public interface IBaz
		{
			public static void DoTheThing();
		}
		`;
        const file3 = `
		public static class DistractionClass
		{
			public DistractionClass UnrelatedThing()
			{
				TestClass.UnrelatedMethod(null);

				UnrelatedMethod(null);
			}

			public void DistractingMethodName()
			{
				TestClass.UnrelatedMethod2(null);
			}
		}
		`;
        // **********************************************************
        // Score with the old 60-line-delimited reference token chunk.
        const oldScores = await findAndScoreBlocks({ source: file0, uri: 'file:///home/user/file0.js', languageId: 'csharp', offset: file0.indexOf('|') }, [
            { source: file1, uri: 'file:///home/user/file1.js', relativePath: 'file1' },
            { source: file2, uri: 'file:///home/user/file2.js', relativePath: 'file2' },
            { source: file3, uri: 'file:///home/user/file3.js', relativePath: 'file3' },
        ], false);
        // We expect the old way to prefer the distraction class, which has lots of terms that look like stuff from
        // the neighboring methods.
        (0, assert_1.default)(fileScore(oldScores, 'file3') > fileScore(oldScores, 'file2') &&
            fileScore(oldScores, 'file2') > fileScore(oldScores, 'file1'), 'Expected 60-line-delimited reference chunks to prefer the distraction class because it resembles neighboring methods');
        // **********************************************************
        // **********************************************************
        // Score with the new subset matching mechanism.
        const newScores = await findAndScoreBlocks({ source: file0, uri: 'file:///home/user/file0.js', languageId: 'csharp', offset: file0.indexOf('|') }, [
            { source: file1, uri: 'file:///home/user/file1.js', relativePath: 'file1' },
            { source: file2, uri: 'file:///home/user/file2.js', relativePath: 'file2' },
            { source: file3, uri: 'file:///home/user/file3.js', relativePath: 'file3' },
        ], true);
        // We expect the new way to prefer the second file because it contains the most tokens that match
        // the method enclosing the caret.
        (0, assert_1.default)(fileScore(newScores, 'file2') > fileScore(newScores, 'file3') &&
            fileScore(newScores, 'file3') === fileScore(newScores, 'file1'), 'Expected that the file containing IBaz interface would be the best match');
        // **********************************************************
    });
});
//# sourceMappingURL=subsetMatching.test.js.map