# webprog-anytone

TypeScript library to program Anytone DMR radios with prepared codeplugs.

## Running tests (radio must be plugged in)

```
npm run build && npm test dist/tests
```

## High level workflow

### Writing codeplug to radio

- pass as input a YAML file which has been put together by qdmr
- parse file into domain objects
- walk graph of domain objects and generate a list of (address, value) tuples
- iterate over list above and write to radio

### Writing contact database

- pass as input a contact database, for example a CSV from radioid.net
- generate a list of (address, value) tuples to write
- erase contactdb
- iterate over list above and write to radio

## TODO

- get radio ID (done)
- read memory (done, but we need a higher level approach)
- write memory
- make a codeplug facade so that it is easy to manipulate?

## Related projects

- https://github.com/reald/anytone-flash-tools
- https://github.com/mycodeplug/dzcb
- https://github.com/OpenRTX/dmrconfig
- https://github.com/hmatuschek/qdmr

## Useful tools

- https://www.k7abd.net/anytone-config-builder/
