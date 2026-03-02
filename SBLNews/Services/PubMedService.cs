using System.Text.Json.Nodes;
using SBLNews.Models;

namespace SBLNews.Services;

public class PubMedService:IScienceNewsService
{
    private readonly HttpClient _httpClient;

    public PubMedService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<List<PaperData>> GetRecentStudiesAsync(string query)
    {
        var results = new List<PaperData>();

        try
        {
            // Search for article IDs
            string searchUrl = $"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={Uri.EscapeDataString(query)}&retmode=json&retmax=15";

            var searchResponse = await _httpClient.GetStringAsync(searchUrl);
            var searchNode = JsonNode.Parse(searchResponse);

            // Extract array of IDs
            var idArray = searchNode?["esearchresult"]?["idlist"]?.AsArray();
            if (idArray == null || idArray.Count == 0) return results;

            // Join the IDs into a comma-separated string (e.g., "123, 456, 789")
            string ids = string.Join(",", idArray.Select(id => id?.ToString()));

            // Fetch summaries for those IDs
            string summaryUrl = $"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id={ids}&retmode=json";

            var summaryResponse = await _httpClient.GetStringAsync(summaryUrl);
            var summaryNode = JsonNode.Parse(summaryResponse);

            var uids = summaryNode?["result"]?["uids"]?.AsArray();
            if (uids == null) return results;

            // Loop through each ID and map it to our existing C# Model
            foreach (var uidNode in uids)
            {
                string uid = uidNode!.ToString();
                var articleNode = summaryNode!["result"]![uid];

                if (articleNode != null)
                {
                    // Map authors
                    var authorsList = new List<AuthorData>();
                    var authorNodes = articleNode["authors"]?.AsArray();
                    if (authorNodes != null)
                    {
                        foreach (var author in authorNodes)
                        {
                            authorsList.Add(new AuthorData { Name = author["name"]?.ToString() ?? "Unknown" });
                        }
                    }

                    // Map year 
                    string pubDate = articleNode["pubdate"]?.ToString() ?? "";
                    int? year = null;
                    if (pubDate.Length >= 4 && int.TryParse(pubDate.Substring(0, 4), out int parsedYear))
                    {
                        year = parsedYear;
                    }

                    // Add to final list
                    results.Add(new PaperData
                    {
                        PaperId = uid,
                        Title = articleNode["title"]?.ToString() ?? "No Title",
                        Year = year,
                        Authors = authorsList
                    });
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error fetching from PubMed: {ex.Message}");
        }

        return results;
    }
}