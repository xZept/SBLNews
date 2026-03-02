using SBLNews.Models;

namespace SBLNews.Services;

public interface IScienceNewsService
{
    Task<List<PaperData>> GetRecentStudiesAsync(string query);
}