# Fieldwork

A content architecture workbench for UX professionals. Define what your content is before deciding what it says.

## Download

Download the latest version from the [Releases](https://github.com/tyler-lyman/fieldwork/releases) page.

## What is content architecture?

The words on your screen are instances of a system. That system is what scales. Not the words themselves.

Most UX teams document content after the fact: a list of rules in a Notion page, a style guide that nobody updates. Content architecture flips that. Instead of static documentation, you build a living model of your content types: what each one does, what rules it follows, and how it actually appears across your product. When the system is explicit, it propagates. When it's implicit, it drifts.

Fieldwork is built on the atomic design framework, applied to content. Elements are the smallest units of copy. Patterns are elements working together. Systems are patterns that span a product. Start at any level, map what you have, and see where the gaps are.

## What it does

Fieldwork helps UX professionals map out their content ecosystem, see where there are holes, and audit the types of content they are building. For each content type (a validation error, a permission prompt, an empty state) you define its job, its rules, and real examples from your product. You can then compare how consistently those content types appear across different surfaces and projects.

## Features

- Define content types with rules, examples, and platform variations
- Track which examples follow the rules and which don't
- Audit any content type across all your projects side by side
- Export content models as AI briefings or team reference docs
- Everything lives as files on your computer. No accounts, no cloud

## Support

Fieldwork is free and always will be. If it's useful to you and you'd like to say thanks, you can buy me a coffee. No pressure either way.

[![Buy Me A Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/tyly)

## Running locally

```
cd desktop
npm install
npm run electron-dev
```

## Building a distributable

```
cd desktop
npm run dist-mac
```
