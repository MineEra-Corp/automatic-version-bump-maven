import * as github from '@actions/github';
import {exec} from '@actions/exec';
import {XMLBuilder, XMLParser} from "fast-xml-parser";
import fs from "fs";
import PackageUtils from './PackageUtils';

async function run() {
    const parser = new XMLParser();

    const pomBuffer = fs.readFileSync('./pom.xml');
    const pomObject = parser.parse(pomBuffer);

    const packageVersion = pomObject.project.version;
    console.log(`Current package version: ${packageVersion}`);

    const pullRequest = github.context.payload.pull_request;
    if (!pullRequest) {
        throw new Error('Pull request not found');
    }
    const pullRequestTitle = `${pullRequest.title}`;
    console.log(`Pull request title is : ${pullRequestTitle}`);

    const pullRequestType = PackageUtils.getPullRequestTypeFromTitle(
        pullRequestTitle
    );
    console.log(`Pull request type is : ${pullRequestType}`);

    const newVersion = PackageUtils.getIncrementedVersion(
        packageVersion,
        pullRequestType
    );
    console.log(`Updated new version : ${newVersion}`);
    pomObject.project.version = newVersion;

    const builder = new XMLBuilder();
    const bumpedPomFile = builder.build(pomObject);

    fs.writeFileSync('./pom.xml', bumpedPomFile);

    await exec('git config --global user.name automatic-version-bump');
    await exec('git config --global user.email wawa27.pro@gmail.com');
    await exec('git add pom.xml');
    await exec('git pull');
    // Update last commit instead a creating a new commit
    await exec('git commit --amend --no-edit');
    await exec('git push origin -f');
}

try {
    run().then((r) => console.log('Finished job !'));
} catch (e) {
    console.error(e);
}
