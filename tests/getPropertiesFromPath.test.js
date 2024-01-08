const { getPropertiesFromPath } = require('../index');

describe('getPropertiesFromPath', () => {
  it('return correct object', () => {
    expect(getPropertiesFromPath('../campaign/deployment/platform')).toEqual(
      {
        campaign: 'campaign',
        deployment: 'deployment',
        platform_name: 'platform',
      }
    );
    expect(getPropertiesFromPath('/root/subdir/campaign/deployment/platform/')).toEqual(
      {
        campaign: 'campaign',
        deployment: 'deployment',
        platform_name: 'platform',
      }
    );
  });
});
