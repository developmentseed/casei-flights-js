const { getPropertiesFromPath } = require('../index');

describe('getPropertiesFromPath', () => {
  it('return correct object', () => {
    expect(getPropertiesFromPath('../campaign/deployment/platform')).toEqual(
      {
        campaign: 'campaign',
        deployment: 'deployment',
        platformName: 'platform',
      }
    );
    expect(getPropertiesFromPath('/root/subdir/campaign/deployment/platform/')).toEqual(
      {
        campaign: 'campaign',
        deployment: 'deployment',
        platformName: 'platform',
      }
    );
  });
});
