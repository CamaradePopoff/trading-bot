#!/bin/sh
# $1: The root directory where a package.json file must be analyzed
# $2: The project prefix to be used in the output file names

PROJECT_DIR=$1
PROJECT_PREFIX=$2
OPEN=$3

usage () {
  echo "Usage: sh `basename "$0"` <PROJECT_DIR> <PROJECT_PREFIX> <OPEN=true>"
  exit
}

if [ -z "$PROJECT_DIR" ]
then
  echo You must specify a npm project directory to analyze.
  usage
fi

if [ -z "$PROJECT_PREFIX" ]
then
  echo You must specify a project prefix to use in the output file names.
  usage
fi

HERE=$(pwd)
TMP=$HERE/tmp
OUT=$HERE/out
JSON_ALL=$TMP/$PROJECT_PREFIX-npm-audit-all.json
JSON_PROD=$TMP/$PROJECT_PREFIX-npm-audit-prod.json
HTML_ALL=$OUT/$PROJECT_PREFIX-npm-dependency-check-report-all.html
HTML_PROD=$OUT/$PROJECT_PREFIX-npm-dependency-check-report-prod.html
TITLE="NPM Audit Report"

mkdir -p "$TMP"
mkdir -p "$OUT"

cd "$PROJECT_DIR"
echo Auditing ALL $PROJECT_PREFIX npm dependencies
npm audit --json >"$JSON_ALL"
echo Auditing PROD $PROJECT_PREFIX npm dependencies only
npm audit --omit=dev --json >"$JSON_PROD"

cd "$HERE"
echo Rendering HTML report for ALL $PROJECT_PREFIX npm dependencies
cat "$JSON_ALL" | npx npm-audit-html@2.0.0-beta.2 --output "$HTML_ALL"
echo Rendering HTML report for PROD $PROJECT_PREFIX npm dependencies
cat "$JSON_PROD" | npx npm-audit-html@2.0.0-beta.2 --output "$HTML_PROD"

if [ "$(uname)" = "Darwin" ]
then
  sed -i '' "s/$TITLE/$TITLE - $PROJECT_PREFIX (all)/g" "$HTML_ALL"
  sed -i '' "s/$TITLE/$TITLE - $PROJECT_PREFIX (prod)/g" "$HTML_PROD"
  if [ "$OPEN" != "false" ]
  then
    open "$HTML_ALL"
    open "$HTML_PROD"
  fi
else
  sed -i "s/$TITLE/$TITLE - $PROJECT_PREFIX (all)/g" "$HTML_ALL"
  sed -i "s/$TITLE/$TITLE - $PROJECT_PREFIX (prod)/g" "$HTML_PROD"
  if [ "$OPEN" != "false" ]
  then
    start "$HTML_ALL"
    start "$HTML_PROD"
  fi
fi

echo DONE. See HTML reports in $OUT.
