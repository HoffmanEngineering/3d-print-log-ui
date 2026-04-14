# Print Projects — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Project` entity to the PrintLogApi so prints can be optionally grouped, with aggregate stats and a grouped feed endpoint.

**Architecture:** New `Project` + `ProjectImage` models with a nullable FK on `Print`. A new `ProjectsController` handles project CRUD and image management. The existing `PrintsController` gains a `filterByProjectId` param on `/summary` and a new `/grouped` endpoint. Project creation can happen inline during print save via `newProjectName`. All business logic lives in `IProjectService`/`ProjectService`, following the existing pattern.

**Tech Stack:** ASP.NET Core 9.0, EF Core 9.0 (SQL Server + SQLite for tests), AutoMapper, xUnit integration tests.

**Must run first:** This plan must be executed before the frontend plan (`2026-04-13-print-projects-frontend.md`).

**Working directory:** `D:/Development/3d-print-log/PrintLogApi`

---

### Task 1: Project and ProjectImage models

**Files:**

- Create: `PrintLogApi/Models/Project.cs`
- Create: `PrintLogApi/Models/ProjectImage.cs`
- Modify: `PrintLogApi/Models/Print.cs`

- [ ] **Step 1: Create `Project.cs`**

```csharp
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PrintLogApi.Models
{
    public class Project : TimestampEntity
    {
        public enum ProjectStatus
        {
            InProgress = 1,
            Complete = 2,
            OnHold = 3,
            Cancelled = 4,
        }

        public enum ProjectViewStatus
        {
            Public = 1,
            Unlisted = 2,
            Private = 3,
        }

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        [MaxLength(100)]
        public string Reference { get; set; }

        public string Description { get; set; }

        [MaxLength(1000)]
        public string Url { get; set; }

        public ProjectStatus Status { get; set; }

        public ProjectViewStatus ViewStatus { get; set; }

        public ICollection<ProjectImage> Images { get; set; }

        public ICollection<Print> Prints { get; set; }
    }
}
```

- [ ] **Step 2: Create `ProjectImage.cs`**

```csharp
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PrintLogApi.Models
{
    public class ProjectImage : TimestampEntity
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public Guid ProjectId { get; set; }
        public Project Project { get; set; }

        public Guid FileId { get; set; }
        public File File { get; set; }

        public bool IsDefault { get; set; }

        public int DisplayOrder { get; set; }
    }
}
```

- [ ] **Step 3: Add `ProjectId` FK to `Print.cs`**

Add these two properties at the bottom of the `Print` class, before the closing brace:

```csharp
public Guid? ProjectId { get; set; }
public Project Project { get; set; }
```

- [ ] **Step 4: Verify the project builds**

```bash
dotnet build PrintLogApi --configuration Release
```

Expected: Build succeeded with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add PrintLogApi/Models/Project.cs PrintLogApi/Models/ProjectImage.cs PrintLogApi/Models/Print.cs
git commit -m "feat: add Project and ProjectImage models with Print FK"
```

---

### Task 2: DbContext registration and EF migration

**Files:**

- Modify: `PrintLogApi/PrintLogContext.cs`

- [ ] **Step 1: Add DbSets and indexes to `PrintLogContext.cs`**

Add after the existing `DbSet<PrintAttachment>` line:

```csharp
public DbSet<Project> Projects { get; set; }
public DbSet<ProjectImage> ProjectImages { get; set; }
```

Add inside `OnModelCreating`, after the existing `PrintImage` index block:

```csharp
modelBuilder.Entity<ProjectImage>()
    .HasIndex(pi => pi.ProjectId)
    .IncludeProperties(pi => new
    {
        pi.Id,
        pi.FileId,
        pi.IsDefault,
        pi.DisplayOrder,
        pi.CreatedDate,
        pi.CreatedById
    })
    .HasDatabaseName("IX_ProjectImages_ProjectId");

modelBuilder.Entity<Project>()
    .HasIndex(p => new { p.CreatedById, p.CreatedDate })
    .IncludeProperties(p => new { p.Id, p.Name, p.Status, p.ViewStatus, p.Reference })
    .HasDatabaseName("IX_Projects_CreatedById_CreatedDate");

modelBuilder.Entity<Print>()
    .HasIndex(p => p.ProjectId)
    .HasDatabaseName("IX_Prints_ProjectId");
```

- [ ] **Step 2: Generate the EF migration**

```bash
dotnet ef migrations add AddProjects --project=PrintLogApi
```

Expected: A new migration file appears in `PrintLogApi/Migrations/`.

- [ ] **Step 3: Verify migration applies to SQLite (used by tests)**

```bash
dotnet test PrintLogApi.IntegrationTests --verbosity quiet
```

Expected: All existing tests pass (the migration auto-applies on test startup).

- [ ] **Step 4: Commit**

```bash
git add PrintLogApi/PrintLogContext.cs PrintLogApi/Migrations/
git commit -m "feat: register Project entities in DbContext and add migration"
```

---

### Task 3: Project DTOs

**Files:**

- Create: `PrintLogApi/Models/DTOs/Project/AddProjectDto.cs`
- Create: `PrintLogApi/Models/DTOs/Project/PutProjectDto.cs`
- Create: `PrintLogApi/Models/DTOs/Project/ProjectSummaryDto.cs`
- Create: `PrintLogApi/Models/DTOs/Project/ProjectDetailDto.cs`
- Create: `PrintLogApi/Models/DTOs/Project/ProjectImageDto.cs`

- [ ] **Step 1: Create `AddProjectDto.cs`**

```csharp
using System.ComponentModel.DataAnnotations;
using static PrintLogApi.Models.Project;

namespace PrintLogApi.Models.DTOs.Project
{
    public class AddProjectDto
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        [MaxLength(100)]
        public string Reference { get; set; }

        public string Description { get; set; }

        [MaxLength(1000)]
        public string Url { get; set; }

        public ProjectStatus Status { get; set; } = ProjectStatus.InProgress;

        public ProjectViewStatus ViewStatus { get; set; } = ProjectViewStatus.Private;
    }
}
```

- [ ] **Step 2: Create `PutProjectDto.cs`**

```csharp
using System;
using System.ComponentModel.DataAnnotations;
using static PrintLogApi.Models.Project;

namespace PrintLogApi.Models.DTOs.Project
{
    public class PutProjectDto
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; }

        [MaxLength(100)]
        public string Reference { get; set; }

        public string Description { get; set; }

        [MaxLength(1000)]
        public string Url { get; set; }

        public ProjectStatus Status { get; set; }

        public ProjectViewStatus ViewStatus { get; set; }
    }
}
```

- [ ] **Step 3: Create `ProjectImageDto.cs`**

```csharp
using System;

namespace PrintLogApi.Models.DTOs.Project
{
    public class ProjectImageDto
    {
        public int Id { get; set; }
        public bool IsDefault { get; set; }
        public int DisplayOrder { get; set; }
        public string Url { get; set; }
    }
}
```

- [ ] **Step 4: Create `ProjectSummaryDto.cs`**

```csharp
using System;
using System.Collections.Generic;
using static PrintLogApi.Models.Project;

namespace PrintLogApi.Models.DTOs.Project
{
    public class ProjectSummaryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Reference { get; set; }
        public ProjectStatus Status { get; set; }
        public ProjectViewStatus ViewStatus { get; set; }
        public DateTimeOffset CreatedDate { get; set; }
        public int PrintCount { get; set; }
        public int TotalPrintTimeInSeconds { get; set; }
        public int TotalEstimatedPrintTimeInSeconds { get; set; }
        public long TotalFilamentWeightMg { get; set; }
        public int DefaultImageId { get; set; }
    }
}
```

- [ ] **Step 5: Create `ProjectDetailDto.cs`**

```csharp
using System;
using System.Collections.Generic;
using PrintLogApi.Models.DTOs.Print;
using static PrintLogApi.Models.Project;

namespace PrintLogApi.Models.DTOs.Project
{
    public class ProjectDetailDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Reference { get; set; }
        public string Description { get; set; }
        public string Url { get; set; }
        public ProjectStatus Status { get; set; }
        public ProjectViewStatus ViewStatus { get; set; }
        public DateTimeOffset CreatedDate { get; set; }
        public long CreatedByUserId { get; set; }
        public int PrintCount { get; set; }
        public int TotalPrintTimeInSeconds { get; set; }
        public int TotalEstimatedPrintTimeInSeconds { get; set; }
        public long TotalFilamentWeightMg { get; set; }
        public IList<ProjectImageDto> Images { get; set; }
    }
}
```

- [ ] **Step 6: Build to verify**

```bash
dotnet build PrintLogApi --configuration Release
```

Expected: Build succeeded with 0 errors.

- [ ] **Step 7: Commit**

```bash
git add PrintLogApi/Models/DTOs/Project/
git commit -m "feat: add Project DTOs"
```

---

### Task 4: Update Print DTOs and GroupedFeedItemDto

**Files:**

- Modify: `PrintLogApi/Models/DTOs/Print/PrintSummaryDTO.cs`
- Modify: `PrintLogApi/Models/DTOs/Print/AddPrintDTO.cs`
- Modify: `PrintLogApi/Models/DTOs/Print/PutPrintDetailDto.cs`
- Create: `PrintLogApi/Models/DTOs/Print/GroupedFeedItemDto.cs`

- [ ] **Step 1: Add project fields to `PrintSummaryDTO.cs`**

Add to the bottom of the class body:

```csharp
public Guid? ProjectId { get; set; }
public string ProjectName { get; set; }
```

- [ ] **Step 2: Add project fields to `AddPrintDTO.cs`**

Add to the bottom of the class body:

```csharp
/// <summary>
/// Assign to an existing project. Takes precedence over NewProjectName.
/// </summary>
public Guid? ProjectId { get; set; }

/// <summary>
/// Create a new project inline and assign this print to it. Ignored if ProjectId is set.
/// </summary>
[MaxLength(100)]
public string NewProjectName { get; set; }
```

- [ ] **Step 3: Add project fields to `PutPrintDetailDto.cs`**

Add to the bottom of the class body (same fields as AddPrintDTO):

```csharp
public Guid? ProjectId { get; set; }

[MaxLength(100)]
public string NewProjectName { get; set; }
```

- [ ] **Step 4: Create `GroupedFeedItemDto.cs`**

```csharp
using System;
using PrintLogApi.Models.DTOs.Project;
using static PrintLogApi.Models.Project;

namespace PrintLogApi.Models.DTOs.Print
{
    /// <summary>
    /// A single item in the grouped/interleaved print feed.
    /// Type discriminator: "project" or "print".
    /// </summary>
    public class GroupedFeedItemDto
    {
        /// <summary>"project" or "print"</summary>
        public string Type { get; set; }

        /// <summary>Used for chronological sort across both types.</summary>
        public DateTimeOffset SortDate { get; set; }

        // --- Project fields (populated when Type == "project") ---
        public Guid? ProjectId { get; set; }
        public string ProjectName { get; set; }
        public string ProjectReference { get; set; }
        public ProjectStatus? ProjectStatus { get; set; }
        public int? PrintCount { get; set; }
        public int? TotalPrintTimeInSeconds { get; set; }
        public int? TotalEstimatedPrintTimeInSeconds { get; set; }
        public long? TotalFilamentWeightMg { get; set; }
        public int? DefaultProjectImageId { get; set; }

        // --- Print fields (populated when Type == "print") ---
        public PrintSummaryDTO Print { get; set; }
    }
}
```

- [ ] **Step 5: Build to verify**

```bash
dotnet build PrintLogApi --configuration Release
```

Expected: Build succeeded with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add PrintLogApi/Models/DTOs/Print/PrintSummaryDTO.cs PrintLogApi/Models/DTOs/Print/AddPrintDTO.cs PrintLogApi/Models/DTOs/Print/PutPrintDetailDto.cs PrintLogApi/Models/DTOs/Print/GroupedFeedItemDto.cs
git commit -m "feat: add project fields to print DTOs and add GroupedFeedItemDto"
```

---

### Task 5: AutoMapper — ProjectProfile and update PrintProfile

**Files:**

- Create: `PrintLogApi/Profiles/ProjectProfile.cs`
- Modify: `PrintLogApi/Profiles/PrintProfile.cs`

- [ ] **Step 1: Create `ProjectProfile.cs`**

```csharp
using AutoMapper;
using PrintLogApi.Models;
using PrintLogApi.Models.DTOs.Project;
using System;
using System.Linq;

namespace PrintLogApi.Profiles
{
    public class ProjectProfile : Profile
    {
        public ProjectProfile()
        {
            CreateMap<AddProjectDto, Project>();

            CreateMap<PutProjectDto, Project>();

            CreateMap<Project, ProjectSummaryDto>()
                .ForMember(dest => dest.CreatedDate,
                    opt => opt.MapFrom(src => (DateTimeOffset)DateTime.SpecifyKind(src.CreatedDate, DateTimeKind.Utc)))
                .ForMember(dest => dest.PrintCount,
                    opt => opt.MapFrom(src => src.Prints.Count()))
                .ForMember(dest => dest.TotalPrintTimeInSeconds,
                    opt => opt.MapFrom(src => src.Prints.Sum(p => p.PrintTimeInSeconds ?? 0)))
                .ForMember(dest => dest.TotalEstimatedPrintTimeInSeconds,
                    opt => opt.MapFrom(src => src.Prints.Sum(p => p.EstimatedPrintTimeInSeconds ?? 0)))
                .ForMember(dest => dest.TotalFilamentWeightMg,
                    opt => opt.MapFrom(src => src.Prints
                        .SelectMany(p => p.FilamentUsage)
                        .Sum(pf => pf.AmountMg.HasValue && pf.AmountMg > 0
                            ? (long)pf.AmountMg.Value
                            : pf.EstimatedAmountMg.HasValue && pf.EstimatedAmountMg > 0
                                ? (long)pf.EstimatedAmountMg.Value : 0L)))
                .ForMember(dest => dest.DefaultImageId,
                    opt => opt.MapFrom(src => src.Images
                        .Where(i => i.IsDefault)
                        .Select(i => i.Id)
                        .FirstOrDefault()));

            CreateMap<Project, ProjectDetailDto>()
                .ForMember(dest => dest.CreatedDate,
                    opt => opt.MapFrom(src => (DateTimeOffset)DateTime.SpecifyKind(src.CreatedDate, DateTimeKind.Utc)))
                .ForMember(dest => dest.CreatedByUserId,
                    opt => opt.MapFrom(src => src.CreatedById))
                .ForMember(dest => dest.PrintCount,
                    opt => opt.MapFrom(src => src.Prints.Count()))
                .ForMember(dest => dest.TotalPrintTimeInSeconds,
                    opt => opt.MapFrom(src => src.Prints.Sum(p => p.PrintTimeInSeconds ?? 0)))
                .ForMember(dest => dest.TotalEstimatedPrintTimeInSeconds,
                    opt => opt.MapFrom(src => src.Prints.Sum(p => p.EstimatedPrintTimeInSeconds ?? 0)))
                .ForMember(dest => dest.TotalFilamentWeightMg,
                    opt => opt.MapFrom(src => src.Prints
                        .SelectMany(p => p.FilamentUsage)
                        .Sum(pf => pf.AmountMg.HasValue && pf.AmountMg > 0
                            ? (long)pf.AmountMg.Value
                            : pf.EstimatedAmountMg.HasValue && pf.EstimatedAmountMg > 0
                                ? (long)pf.EstimatedAmountMg.Value : 0L)))
                .ForMember(dest => dest.Images,
                    opt => opt.MapFrom(src => src.Images.OrderBy(i => i.DisplayOrder)));

            CreateMap<ProjectImage, ProjectImageDto>()
                .ForMember(dest => dest.Url, opt => opt.Ignore()); // URL resolved at request time
        }
    }
}
```

- [ ] **Step 2: Update `PrintProfile.cs` — add `ProjectId` and `ProjectName` to the `Print → PrintSummaryDTO` map**

In the `CreateMap<Print, PrintSummaryDTO>()` block, add these two `ForMember` calls after the existing ones:

```csharp
.ForMember(dest => dest.ProjectId,
    opt => opt.MapFrom(src => src.ProjectId))
.ForMember(dest => dest.ProjectName,
    opt => opt.MapFrom(src => src.Project != null ? src.Project.Name : null))
```

- [ ] **Step 3: Build to verify AutoMapper config compiles**

```bash
dotnet build PrintLogApi --configuration Release
```

Expected: Build succeeded with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add PrintLogApi/Profiles/ProjectProfile.cs PrintLogApi/Profiles/PrintProfile.cs
git commit -m "feat: add ProjectProfile AutoMapper config and update PrintProfile"
```

---

### Task 6: IProjectService and ProjectService

**Files:**

- Create: `PrintLogApi/Services/IProjectService.cs`
- Create: `PrintLogApi/Services/ProjectService.cs`

- [ ] **Step 1: Write a failing integration test for `GET /api/Projects` (empty list)**

Create `PrintLogApi.IntegrationTests/Controllers/ProjectsControllerTests.cs`:

```csharp
using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using PrintLogApi.Models;
using PrintLogApi.Models.DTOs.Project;
using Xunit;

namespace PrintLogApi.IntegrationTests.Controllers
{
    public class ProjectsControllerTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly HttpClient _client;

        public ProjectsControllerTests(CustomWebApplicationFactory factory)
        {
            _client = factory.CreateClient();
        }

        private HttpRequestMessage AuthenticatedRequest(HttpMethod method, string url)
        {
            var request = new HttpRequestMessage(method, url);
            request.Headers.Add(TestAuthHandler.TestUserIdHeader, IntegrationTestSeeder.TestUserOAuthId);
            return request;
        }

        [Fact]
        public async Task GetProjects_ReturnsEmptyList_WhenNoProjects()
        {
            var request = AuthenticatedRequest(HttpMethod.Get, "/api/Projects?PageNumber=1&PageSize=10");
            var response = await _client.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<PagedList<ProjectSummaryDto>>();
            Assert.NotNull(result);
            Assert.Empty(result.Items);
        }

        [Fact]
        public async Task PostProject_CreatesProject_ReturnsCreated()
        {
            var dto = new AddProjectDto
            {
                Name = "Test Voron Build",
                Status = Models.Project.ProjectStatus.InProgress,
                ViewStatus = Models.Project.ProjectViewStatus.Private
            };
            var request = AuthenticatedRequest(HttpMethod.Post, "/api/Projects");
            request.Content = JsonContent.Create(dto);

            var response = await _client.SendAsync(request);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<ProjectDetailDto>();
            Assert.NotNull(result);
            Assert.Equal("Test Voron Build", result.Name);
            Assert.NotEqual(Guid.Empty, result.Id);
        }

        [Fact]
        public async Task GetProjectById_ReturnsProject()
        {
            // Create
            var createDto = new AddProjectDto { Name = "Get Test Project", Status = Models.Project.ProjectStatus.InProgress, ViewStatus = Models.Project.ProjectViewStatus.Private };
            var createReq = AuthenticatedRequest(HttpMethod.Post, "/api/Projects");
            createReq.Content = JsonContent.Create(createDto);
            var createResp = await _client.SendAsync(createReq);
            var created = await createResp.Content.ReadFromJsonAsync<ProjectDetailDto>();

            // Get
            var getReq = AuthenticatedRequest(HttpMethod.Get, $"/api/Projects/{created.Id}");
            var getResp = await _client.SendAsync(getReq);
            Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);
            var result = await getResp.Content.ReadFromJsonAsync<ProjectDetailDto>();
            Assert.Equal(created.Id, result.Id);
        }

        [Fact]
        public async Task DeleteProject_UnlinksPrints_WhenDeletePrintsFalse()
        {
            // Create project
            var createDto = new AddProjectDto { Name = "Delete Test Project", Status = Models.Project.ProjectStatus.InProgress, ViewStatus = Models.Project.ProjectViewStatus.Private };
            var createReq = AuthenticatedRequest(HttpMethod.Post, "/api/Projects");
            createReq.Content = JsonContent.Create(createDto);
            var createResp = await _client.SendAsync(createReq);
            var project = await createResp.Content.ReadFromJsonAsync<ProjectDetailDto>();

            // Delete
            var deleteReq = AuthenticatedRequest(HttpMethod.Delete, $"/api/Projects/{project.Id}?deletePrints=false");
            var deleteResp = await _client.SendAsync(deleteReq);
            Assert.Equal(HttpStatusCode.OK, deleteResp.StatusCode);

            // Confirm gone
            var getReq = AuthenticatedRequest(HttpMethod.Get, $"/api/Projects/{project.Id}");
            var getResp = await _client.SendAsync(getReq);
            Assert.Equal(HttpStatusCode.NotFound, getResp.StatusCode);
        }
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
dotnet test PrintLogApi.IntegrationTests --verbosity quiet
```

Expected: The new tests fail with "No route matched" or connection errors — the controller doesn't exist yet.

- [ ] **Step 3: Create `IProjectService.cs`**

```csharp
using System;
using System.Threading.Tasks;
using PrintLogApi.Models;
using PrintLogApi.Models.DTOs.Project;

namespace PrintLogApi.Services
{
    public interface IProjectService
    {
        Task<PagedList<ProjectSummaryDto>> GetProjectSummariesAsync(int pageNumber, int pageSize, long userId);
        Task<Project> GetProjectByIdAsync(Guid id);
        Task<Project> CreateProjectAsync(AddProjectDto dto, long userId);
        Task<Project> UpdateProjectAsync(Guid id, PutProjectDto dto, long userId);
        Task DeleteProjectAsync(Guid id, bool deletePrints, long userId);
    }
}
```

- [ ] **Step 4: Create `ProjectService.cs`**

```csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using PrintLogApi.Exceptions;
using PrintLogApi.Models;
using PrintLogApi.Models.DTOs.Project;

namespace PrintLogApi.Services
{
    public class ProjectService : IProjectService
    {
        private readonly PrintLogContext _context;
        private readonly IMapper _mapper;

        public ProjectService(PrintLogContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<PagedList<ProjectSummaryDto>> GetProjectSummariesAsync(int pageNumber, int pageSize, long userId)
        {
            var query = _context.Projects
                .Where(p => p.CreatedById == userId)
                .Include(p => p.Images)
                .Include(p => p.Prints)
                    .ThenInclude(pr => pr.FilamentUsage)
                .OrderByDescending(p => p.CreatedDate)
                .AsNoTracking();

            var total = await query.CountAsync();
            var items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = items.Select(p => _mapper.Map<ProjectSummaryDto>(p)).ToList();
            return new PagedList<ProjectSummaryDto>(dtos, total, pageNumber, pageSize);
        }

        public async Task<Project> GetProjectByIdAsync(Guid id)
        {
            return await _context.Projects
                .Include(p => p.Images)
                    .ThenInclude(i => i.File)
                .Include(p => p.Prints)
                    .ThenInclude(pr => pr.FilamentUsage)
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<Project> CreateProjectAsync(AddProjectDto dto, long userId)
        {
            var project = _mapper.Map<Project>(dto);
            project.Id = Guid.NewGuid();
            project.CreatedById = userId;
            project.UpdatedById = userId;

            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            return await GetProjectByIdAsync(project.Id);
        }

        public async Task<Project> UpdateProjectAsync(Guid id, PutProjectDto dto, long userId)
        {
            var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == id);
            if (project == null)
                throw new DoesNotExistException();

            _mapper.Map(dto, project);
            project.UpdatedById = userId;

            await _context.SaveChangesAsync();
            return await GetProjectByIdAsync(id);
        }

        public async Task DeleteProjectAsync(Guid id, bool deletePrints, long userId)
        {
            var project = await _context.Projects
                .Include(p => p.Prints)
                .Include(p => p.Images)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null)
                throw new DoesNotExistException();

            if (deletePrints)
            {
                _context.Prints.RemoveRange(project.Prints);
            }
            else
            {
                foreach (var print in project.Prints)
                {
                    print.ProjectId = null;
                }
            }

            _context.ProjectImages.RemoveRange(project.Images);
            _context.Projects.Remove(project);
            await _context.SaveChangesAsync();
        }
    }
}
```

- [ ] **Step 5: Register `ProjectService` in `Startup.cs`**

In `Startup.cs`, inside `ConfigureServices`, add alongside the existing `AddTransient` calls:

```csharp
services.AddTransient<IProjectService, ProjectService>();
```

- [ ] **Step 6: Build to verify**

```bash
dotnet build PrintLogApi --configuration Release
```

Expected: Build succeeded with 0 errors.

- [ ] **Step 7: Commit**

```bash
git add PrintLogApi/Services/IProjectService.cs PrintLogApi/Services/ProjectService.cs PrintLogApi/Startup.cs PrintLogApi.IntegrationTests/Controllers/ProjectsControllerTests.cs
git commit -m "feat: add IProjectService and ProjectService with integration tests"
```

---

### Task 7: ProjectsController (CRUD)

**Files:**

- Create: `PrintLogApi/Controllers/ProjectsController.cs`

- [ ] **Step 1: Create `ProjectsController.cs`**

```csharp
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PrintLogApi.Exceptions;
using PrintLogApi.Extensions;
using PrintLogApi.Models;
using PrintLogApi.Models.DTOs.Project;
using PrintLogApi.Services;
using AutoMapper;

namespace PrintLogApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProjectsController : ControllerBase
    {
        private readonly IProjectService _projectService;
        private readonly IMapper _mapper;
        private readonly ICacheVersionService _cacheVersionService;

        public ProjectsController(
            IProjectService projectService,
            IMapper mapper,
            ICacheVersionService cacheVersionService)
        {
            _projectService = projectService;
            _mapper = mapper;
            _cacheVersionService = cacheVersionService;
        }

        /// <summary>Get a paged list of the current user's projects.</summary>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<PagedList<ProjectSummaryDto>>> GetProjects(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10)
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
                return Unauthorized();

            var result = await _projectService.GetProjectSummariesAsync(pageNumber, pageSize, userId.Value);
            return Ok(result);
        }

        /// <summary>Get a project's full detail by ID. Public/Unlisted projects are accessible without auth.</summary>
        [HttpGet("{id}")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ProjectDetailDto>> GetProjectById(Guid id)
        {
            var project = await _projectService.GetProjectByIdAsync(id);
            if (project == null)
                return NotFound();

            var currentUserId = User.GetUserId();
            var isOwner = currentUserId.HasValue && project.CreatedById == currentUserId.Value;

            if (project.ViewStatus == Project.ProjectViewStatus.Private && !isOwner)
                return Forbid();

            return Ok(_mapper.Map<ProjectDetailDto>(project));
        }

        /// <summary>Create a new project.</summary>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ProjectDetailDto>> PostProject(AddProjectDto dto)
        {
            var userId = User.GetUserId();
            if (!userId.HasValue)
                return Unauthorized();

            var project = await _projectService.CreateProjectAsync(dto, userId.Value);
            _cacheVersionService.InvalidateUserCache(userId.Value);

            return CreatedAtAction(nameof(GetProjectById), new { id = project.Id },
                _mapper.Map<ProjectDetailDto>(project));
        }

        /// <summary>Update a project's metadata.</summary>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<ProjectDetailDto>> PutProject(Guid id, PutProjectDto dto)
        {
            if (id != dto.Id)
                return BadRequest("ID in route does not match body.");

            var existing = await _projectService.GetProjectByIdAsync(id);
            if (existing == null)
                return NotFound();

            var userId = User.GetUserId();
            if (!userId.HasValue)
                return Unauthorized();

            if (existing.CreatedById != userId.Value)
                return Forbid();

            var updated = await _projectService.UpdateProjectAsync(id, dto, userId.Value);
            _cacheVersionService.InvalidateUserCache(userId.Value);

            return Ok(_mapper.Map<ProjectDetailDto>(updated));
        }

        /// <summary>
        /// Delete a project. If deletePrints=true, also deletes member prints.
        /// If deletePrints=false (default), prints are unlinked and become standalone.
        /// </summary>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult> DeleteProject(Guid id, [FromQuery] bool deletePrints = false)
        {
            var existing = await _projectService.GetProjectByIdAsync(id);
            if (existing == null)
                return NotFound();

            var userId = User.GetUserId();
            if (!userId.HasValue)
                return Unauthorized();

            if (existing.CreatedById != userId.Value)
                return Forbid();

            try
            {
                await _projectService.DeleteProjectAsync(id, deletePrints, userId.Value);
                _cacheVersionService.InvalidateUserCache(userId.Value);
                return Ok();
            }
            catch (DoesNotExistException)
            {
                return NotFound();
            }
        }
    }
}
```

- [ ] **Step 2: Run integration tests to verify they pass**

```bash
dotnet test PrintLogApi.IntegrationTests --verbosity quiet
```

Expected: All tests pass including the four `ProjectsControllerTests`.

- [ ] **Step 3: Commit**

```bash
git add PrintLogApi/Controllers/ProjectsController.cs
git commit -m "feat: add ProjectsController with CRUD endpoints"
```

---

### Task 8: Project image upload endpoint

**Files:**

- Modify: `PrintLogApi/Controllers/ProjectsController.cs`
- Modify: `PrintLogApi/Services/IProjectService.cs`
- Modify: `PrintLogApi/Services/ProjectService.cs`

- [ ] **Step 1: Add image integration test**

Add to `ProjectsControllerTests.cs`:

```csharp
[Fact]
public async Task PostProjectImage_ReturnsCreated()
{
    // Create project
    var createDto = new AddProjectDto { Name = "Image Test Project", Status = Models.Project.ProjectStatus.InProgress, ViewStatus = Models.Project.ProjectViewStatus.Private };
    var createReq = AuthenticatedRequest(HttpMethod.Post, "/api/Projects");
    createReq.Content = JsonContent.Create(createDto);
    var createResp = await _client.SendAsync(createReq);
    var project = await createResp.Content.ReadFromJsonAsync<ProjectDetailDto>();

    // Upload image (1x1 transparent PNG as base64)
    var imageBytes = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
    var form = new MultipartFormDataContent();
    form.Add(new ByteArrayContent(imageBytes), "file", "test.png");

    var imgReq = AuthenticatedRequest(HttpMethod.Post, $"/api/Projects/{project.Id}/images");
    imgReq.Content = form;
    var imgResp = await _client.SendAsync(imgReq);
    Assert.Equal(HttpStatusCode.Created, imgResp.StatusCode);
}
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
dotnet test PrintLogApi.IntegrationTests --filter "PostProjectImage_ReturnsCreated" --verbosity quiet
```

Expected: FAIL — route not found.

- [ ] **Step 3: Add image methods to `IProjectService.cs`**

```csharp
Task<ProjectImage> AddImageAsync(Guid projectId, IFormFile file, long userId);
Task DeleteImageAsync(Guid projectId, int imageId, long userId);
Task ReorderImagesAsync(Guid projectId, IList<int> orderedImageIds, long userId);
```

- [ ] **Step 4: Add image methods to `ProjectService.cs`**

Add these methods. The `IBlobStorageService` stores images in Azure Blob Storage; the `File` entity records the blob path.

```csharp
public async Task<ProjectImage> AddImageAsync(Guid projectId, IFormFile file, long userId)
{
    var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == projectId);
    if (project == null) throw new DoesNotExistException();

    // Save to blob storage
    var blobName = $"{Guid.NewGuid()}{System.IO.Path.GetExtension(file.FileName)}";
    using var stream = file.OpenReadStream();
    await _blobStorageService.UploadAsync("projectimages", blobName, stream, file.ContentType);

    var fileEntity = new Models.File { Path = blobName, CreatedById = userId, UpdatedById = userId };
    _context.Files.Add(fileEntity);
    await _context.SaveChangesAsync();

    var existingCount = await _context.ProjectImages.CountAsync(pi => pi.ProjectId == projectId);
    var image = new ProjectImage
    {
        ProjectId = projectId,
        FileId = fileEntity.Id,
        IsDefault = existingCount == 0,
        DisplayOrder = existingCount,
        CreatedById = userId,
        UpdatedById = userId
    };
    _context.ProjectImages.Add(image);
    await _context.SaveChangesAsync();
    return image;
}

public async Task DeleteImageAsync(Guid projectId, int imageId, long userId)
{
    var image = await _context.ProjectImages
        .FirstOrDefaultAsync(pi => pi.ProjectId == projectId && pi.Id == imageId);
    if (image == null) throw new DoesNotExistException();
    _context.ProjectImages.Remove(image);
    await _context.SaveChangesAsync();
}

public async Task ReorderImagesAsync(Guid projectId, IList<int> orderedImageIds, long userId)
{
    var images = await _context.ProjectImages
        .Where(pi => pi.ProjectId == projectId)
        .ToListAsync();

    for (int i = 0; i < orderedImageIds.Count; i++)
    {
        var img = images.FirstOrDefault(im => im.Id == orderedImageIds[i]);
        if (img != null) img.DisplayOrder = i;
    }
    await _context.SaveChangesAsync();
}
```

Add `IBlobStorageService _blobStorageService` as a constructor parameter and field.

- [ ] **Step 5: Add image endpoints to `ProjectsController.cs`**

```csharp
[HttpPost("{id}/images")]
[ProducesResponseType(StatusCodes.Status201Created)]
public async Task<ActionResult<ProjectImageDto>> PostProjectImage(Guid id, IFormFile file)
{
    var userId = User.GetUserId();
    if (!userId.HasValue) return Unauthorized();

    var project = await _projectService.GetProjectByIdAsync(id);
    if (project == null) return NotFound();
    if (project.CreatedById != userId.Value) return Forbid();

    try
    {
        var image = await _projectService.AddImageAsync(id, file, userId.Value);
        _cacheVersionService.InvalidateUserCache(userId.Value);
        return CreatedAtAction(nameof(GetProjectById), new { id }, _mapper.Map<ProjectImageDto>(image));
    }
    catch (DoesNotExistException)
    {
        return NotFound();
    }
}

[HttpDelete("{id}/images/{imageId}")]
[ProducesResponseType(StatusCodes.Status200OK)]
public async Task<ActionResult> DeleteProjectImage(Guid id, int imageId)
{
    var userId = User.GetUserId();
    if (!userId.HasValue) return Unauthorized();

    var project = await _projectService.GetProjectByIdAsync(id);
    if (project == null) return NotFound();
    if (project.CreatedById != userId.Value) return Forbid();

    try
    {
        await _projectService.DeleteImageAsync(id, imageId, userId.Value);
        _cacheVersionService.InvalidateUserCache(userId.Value);
        return Ok();
    }
    catch (DoesNotExistException) { return NotFound(); }
}

[HttpPut("{id}/images/reorder")]
[ProducesResponseType(StatusCodes.Status200OK)]
public async Task<ActionResult> ReorderProjectImages(Guid id, [FromBody] IList<int> orderedImageIds)
{
    var userId = User.GetUserId();
    if (!userId.HasValue) return Unauthorized();

    var project = await _projectService.GetProjectByIdAsync(id);
    if (project == null) return NotFound();
    if (project.CreatedById != userId.Value) return Forbid();

    await _projectService.ReorderImagesAsync(id, orderedImageIds, userId.Value);
    _cacheVersionService.InvalidateUserCache(userId.Value);
    return Ok();
}
```

- [ ] **Step 6: Run all tests**

```bash
dotnet test PrintLogApi.IntegrationTests --verbosity quiet
```

Expected: All tests pass including `PostProjectImage_ReturnsCreated`.

- [ ] **Step 7: Commit**

```bash
git add PrintLogApi/Controllers/ProjectsController.cs PrintLogApi/Services/IProjectService.cs PrintLogApi/Services/ProjectService.cs PrintLogApi.IntegrationTests/Controllers/ProjectsControllerTests.cs
git commit -m "feat: add project image upload/delete/reorder endpoints"
```

---

### Task 9: Update PrintService — project assignment (projectId / newProjectName)

**Files:**

- Modify: `PrintLogApi/Services/IPrintService.cs`
- Modify: `PrintLogApi/Services/PrintService.cs`

- [ ] **Step 1: Write a failing integration test**

Add to `PrintLogApi.IntegrationTests/Controllers/PrintsControllerTests.cs`:

```csharp
[Fact]
public async Task PostPrint_WithNewProjectName_CreatesProjectAndAssignsPrint()
{
    var dto = new
    {
        title = "Voron Part 1",
        printerId = IntegrationTestSeeder.TestPrinterId,
        status = 3, // Success
        viewStatus = 3, // Private
        allowComments = false,
        filamentUsage = Array.Empty<object>(),
        filamentType = "",
        notes = "",
        url = "",
        fileName = "",
        newProjectName = "My Voron Build"
    };

    var request = new HttpRequestMessage(HttpMethod.Post, "/api/Prints");
    request.Headers.Add(TestAuthHandler.TestUserIdHeader, IntegrationTestSeeder.TestUserOAuthId);
    request.Content = JsonContent.Create(dto);

    var response = await _client.SendAsync(request);
    Assert.Equal(HttpStatusCode.Created, response.StatusCode);

    var result = await response.Content.ReadFromJsonAsync<PrintDetailDTO>();
    Assert.NotNull(result.ProjectId);
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
dotnet test PrintLogApi.IntegrationTests --filter "PostPrint_WithNewProjectName" --verbosity quiet
```

Expected: FAIL — `ProjectId` is null because `newProjectName` is not yet handled.

- [ ] **Step 3: Update `PrintService.AddPrint` to handle `ProjectId` / `newProjectName`**

In `PrintService.cs`, in the `AddPrint` method, add this block before `_context.Prints.Add(newPrint)`:

```csharp
// Resolve project assignment
if (dto.ProjectId.HasValue)
{
    var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == dto.ProjectId.Value && p.CreatedById == userId);
    if (project == null) throw new DoesNotExistException();
    newPrint.ProjectId = project.Id;
}
else if (!string.IsNullOrWhiteSpace(dto.NewProjectName))
{
    var newProject = new Project
    {
        Id = Guid.NewGuid(),
        Name = dto.NewProjectName.Trim(),
        Status = Project.ProjectStatus.InProgress,
        ViewStatus = Project.ProjectViewStatus.Private,
        CreatedById = userId,
        UpdatedById = userId
    };
    _context.Projects.Add(newProject);
    newPrint.ProjectId = newProject.Id;
}
```

- [ ] **Step 4: Update `PrintService.UpdatePrint` with the same logic**

In the `UpdatePrint` method, after mapping the DTO to the existing print entity:

```csharp
// Resolve project assignment
if (dto.ProjectId.HasValue)
{
    var project = await _context.Projects.FirstOrDefaultAsync(p => p.Id == dto.ProjectId.Value && p.CreatedById == userId);
    if (project == null) throw new DoesNotExistException();
    existingPrint.ProjectId = project.Id;
}
else if (!string.IsNullOrWhiteSpace(dto.NewProjectName))
{
    var newProject = new Project
    {
        Id = Guid.NewGuid(),
        Name = dto.NewProjectName.Trim(),
        Status = Project.ProjectStatus.InProgress,
        ViewStatus = Project.ProjectViewStatus.Private,
        CreatedById = userId,
        UpdatedById = userId
    };
    _context.Projects.Add(newProject);
    existingPrint.ProjectId = newProject.Id;
}
else
{
    // Explicit null clears the project assignment
    existingPrint.ProjectId = dto.ProjectId; // null
}
```

- [ ] **Step 5: Run tests**

```bash
dotnet test PrintLogApi.IntegrationTests --verbosity quiet
```

Expected: All tests pass including `PostPrint_WithNewProjectName_CreatesProjectAndAssignsPrint`.

- [ ] **Step 6: Commit**

```bash
git add PrintLogApi/Services/PrintService.cs PrintLogApi.IntegrationTests/Controllers/PrintsControllerTests.cs
git commit -m "feat: handle projectId and newProjectName in print create/update"
```

---

### Task 10: Update `GET /api/Prints/summary` — filterByProjectId

**Files:**

- Modify: `PrintLogApi/Services/PrintService.cs`
- Modify: `PrintLogApi/Controllers/PrintsController.cs`

- [ ] **Step 1: Write a failing test**

Add to `PrintsControllerTests.cs`:

```csharp
[Fact]
public async Task GetPrintSummary_FilterByProjectId_ReturnsPrintsInProject()
{
    // Create project
    var projectDto = new { name = "Filter Test Project", status = 1, viewStatus = 3 };
    var projReq = new HttpRequestMessage(HttpMethod.Post, "/api/Projects");
    projReq.Headers.Add(TestAuthHandler.TestUserIdHeader, IntegrationTestSeeder.TestUserOAuthId);
    projReq.Content = JsonContent.Create(projectDto);
    var projResp = await _client.SendAsync(projReq);
    var project = await projResp.Content.ReadFromJsonAsync<ProjectDetailDto>();

    // Create print assigned to project
    var printDto = new
    {
        title = "Filtered Print",
        printerId = IntegrationTestSeeder.TestPrinterId,
        status = 3, viewStatus = 3, allowComments = false,
        filamentUsage = Array.Empty<object>(), filamentType = "", notes = "", url = "", fileName = "",
        projectId = project.Id
    };
    var printReq = new HttpRequestMessage(HttpMethod.Post, "/api/Prints");
    printReq.Headers.Add(TestAuthHandler.TestUserIdHeader, IntegrationTestSeeder.TestUserOAuthId);
    printReq.Content = JsonContent.Create(printDto);
    await _client.SendAsync(printReq);

    // Filter by project
    var request = new HttpRequestMessage(HttpMethod.Get, $"/api/Prints/summary?PageNumber=1&PageSize=10&filterByProjectId={project.Id}");
    request.Headers.Add(TestAuthHandler.TestUserIdHeader, IntegrationTestSeeder.TestUserOAuthId);
    var response = await _client.SendAsync(request);
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    var result = await response.Content.ReadFromJsonAsync<PagedList<PrintSummaryDTO>>();
    Assert.All(result.Items, item => Assert.Equal(project.Id, item.ProjectId));
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
dotnet test PrintLogApi.IntegrationTests --filter "GetPrintSummary_FilterByProjectId" --verbosity quiet
```

Expected: FAIL — `filterByProjectId` param is not wired up yet.

- [ ] **Step 3: Add `filterByProjectId` param to `PrintsController.GetPrintSummary`**

Add the parameter to the method signature:

```csharp
[FromQuery] Guid? filterByProjectId,
```

Pass it through to the service:

```csharp
var result = await _printService.SearchPrintSummary(pagingRequest, searchText, sortRequest, filterByPrinterIds, filterByFilamentIds, filterByStatus, userId, currentUserId, filterByProjectId);
```

Also update the `cacheKey` generation to include `filterByProjectId`.

- [ ] **Step 4: Add `filterByProjectId` to `IPrintService` and `PrintService.SearchPrintSummary`**

In `IPrintService.cs`, add the parameter to the signature:

```csharp
Task<PagedList<PrintSummaryDTO>> SearchPrintSummary(..., Guid? filterByProjectId = null);
```

In `PrintService.SearchPrintSummary`, add after the existing filament filter:

```csharp
if (filterByProjectId.HasValue)
{
    printQuery = printQuery.Where(p => p.ProjectId == filterByProjectId.Value);
}
```

Also update the `Include` chain to include `p.Project` so `ProjectName` maps correctly:

```csharp
.Include(p => p.Project)
```

- [ ] **Step 5: Run tests**

```bash
dotnet test PrintLogApi.IntegrationTests --verbosity quiet
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add PrintLogApi/Controllers/PrintsController.cs PrintLogApi/Services/IPrintService.cs PrintLogApi/Services/PrintService.cs PrintLogApi.IntegrationTests/Controllers/PrintsControllerTests.cs
git commit -m "feat: add filterByProjectId to GET /api/Prints/summary"
```

---

### Task 11: Add `GET /api/Prints/grouped` endpoint

**Files:**

- Modify: `PrintLogApi/Services/IPrintService.cs`
- Modify: `PrintLogApi/Services/PrintService.cs`
- Modify: `PrintLogApi/Controllers/PrintsController.cs`

- [ ] **Step 1: Write a failing integration test**

Add to `PrintsControllerTests.cs`:

```csharp
[Fact]
public async Task GetPrintsGrouped_ReturnsMixedFeed()
{
    var request = new HttpRequestMessage(HttpMethod.Get, "/api/Prints/grouped?pageNumber=1&pageSize=10");
    request.Headers.Add(TestAuthHandler.TestUserIdHeader, IntegrationTestSeeder.TestUserOAuthId);

    var response = await _client.SendAsync(request);
    Assert.Equal(HttpStatusCode.OK, response.StatusCode);

    var result = await response.Content.ReadFromJsonAsync<PagedList<GroupedFeedItemDto>>();
    Assert.NotNull(result);
    Assert.All(result.Items, item => Assert.Contains(item.Type, new[] { "project", "print" }));
}
```

- [ ] **Step 2: Run to confirm failure**

```bash
dotnet test PrintLogApi.IntegrationTests --filter "GetPrintsGrouped_ReturnsMixedFeed" --verbosity quiet
```

Expected: FAIL — route not found.

- [ ] **Step 3: Add `GetGroupedFeedAsync` to `IPrintService.cs`**

```csharp
Task<PagedList<GroupedFeedItemDto>> GetGroupedFeedAsync(int pageNumber, int pageSize, long userId);
```

- [ ] **Step 4: Implement `GetGroupedFeedAsync` in `PrintService.cs`**

This implementation fetches projects and standalone prints separately, merges them chronologically, then pages the merged result in memory. This is suitable for typical user volumes; a SQL UNION optimisation can be added later if needed.

```csharp
public async Task<PagedList<GroupedFeedItemDto>> GetGroupedFeedAsync(int pageNumber, int pageSize, long userId)
{
    // Fetch all project summaries for this user
    var projects = await _context.Projects
        .Where(p => p.CreatedById == userId)
        .Include(p => p.Images)
        .Include(p => p.Prints)
            .ThenInclude(pr => pr.FilamentUsage)
        .AsNoTracking()
        .ToListAsync();

    var projectItems = projects.Select(p => new GroupedFeedItemDto
    {
        Type = "project",
        SortDate = (DateTimeOffset)DateTime.SpecifyKind(p.CreatedDate, DateTimeKind.Utc),
        ProjectId = p.Id,
        ProjectName = p.Name,
        ProjectReference = p.Reference,
        ProjectStatus = p.Status,
        PrintCount = p.Prints.Count,
        TotalPrintTimeInSeconds = p.Prints.Sum(pr => pr.PrintTimeInSeconds ?? 0),
        TotalEstimatedPrintTimeInSeconds = p.Prints.Sum(pr => pr.EstimatedPrintTimeInSeconds ?? 0),
        TotalFilamentWeightMg = p.Prints.SelectMany(pr => pr.FilamentUsage)
            .Sum(pf => pf.AmountMg.HasValue && pf.AmountMg > 0
                ? (long)pf.AmountMg.Value
                : pf.EstimatedAmountMg.HasValue && pf.EstimatedAmountMg > 0
                    ? (long)pf.EstimatedAmountMg.Value : 0L),
        DefaultProjectImageId = p.Images.Where(i => i.IsDefault).Select(i => i.Id).FirstOrDefault(),
    }).ToList();

    // Fetch standalone prints (no project)
    var standalonePrintIds = await _context.Prints
        .Where(p => p.CreatedById == userId && p.ProjectId == null)
        .OrderByDescending(p => p.StartDate ?? (DateTimeOffset)p.CreatedDate)
        .Select(p => p.Id)
        .ToListAsync();

    var standalonePrints = await _context.Prints
        .Where(p => standalonePrintIds.Contains(p.Id))
        .Include(p => p.Printer)
            .ThenInclude(pr => pr.Category)
                .ThenInclude(c => c.MaterialCategory)
        .Include(p => p.FilamentUsage)
            .ThenInclude(pf => pf.Filament)
                .ThenInclude(f => f.MaterialCategory)
        .Include(p => p.Images)
        .AsNoTracking()
        .AsSplitQuery()
        .ToListAsync();

    var printItems = standalonePrints.Select(p =>
    {
        var sortDate = p.StartDate ?? (DateTimeOffset)DateTime.SpecifyKind(p.CreatedDate, DateTimeKind.Utc);
        return new GroupedFeedItemDto
        {
            Type = "print",
            SortDate = sortDate,
            Print = _mapper.Map<PrintSummaryDTO>(p)
        };
    }).ToList();

    // Merge and sort descending by SortDate
    var merged = projectItems
        .Concat(printItems)
        .OrderByDescending(x => x.SortDate)
        .ToList();

    var total = merged.Count;
    var paged = merged
        .Skip((pageNumber - 1) * pageSize)
        .Take(pageSize)
        .ToList();

    return new PagedList<GroupedFeedItemDto>(paged, total, pageNumber, pageSize);
}
```

- [ ] **Step 5: Add the route to `PrintsController.cs`**

```csharp
/// <summary>
/// Returns a chronologically interleaved list of project rows and standalone print rows for the current user.
/// </summary>
[HttpGet("grouped")]
[ProducesResponseType(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public async Task<ActionResult<PagedList<GroupedFeedItemDto>>> GetGrouped(
    [FromQuery] int pageNumber = 1,
    [FromQuery] int pageSize = 20)
{
    var userId = User.GetUserId();
    if (!userId.HasValue)
        return Unauthorized();

    var result = await _printService.GetGroupedFeedAsync(pageNumber, pageSize, userId.Value);
    return Ok(result);
}
```

- [ ] **Step 6: Run all tests**

```bash
dotnet test PrintLogApi.IntegrationTests --verbosity quiet
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add PrintLogApi/Controllers/PrintsController.cs PrintLogApi/Services/IPrintService.cs PrintLogApi/Services/PrintService.cs PrintLogApi.IntegrationTests/Controllers/PrintsControllerTests.cs
git commit -m "feat: add GET /api/Prints/grouped interleaved feed endpoint"
```

---

### Task 12: Final build and test run

- [ ] **Step 1: Full build**

```bash
dotnet build --configuration Release
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 2: Full test suite**

```bash
dotnet test --verbosity quiet
```

Expected: All tests pass.

- [ ] **Step 3: Commit any fixes, then push branch**

```bash
git push origin HEAD
```

---

## Spec Coverage Check

| Spec requirement                                                                   | Task                                   |
| ---------------------------------------------------------------------------------- | -------------------------------------- |
| Project entity (Id, Name, Reference, Description, Url, Status, ViewStatus, Images) | Task 1                                 |
| PrintImage mirrors pattern                                                         | Task 1                                 |
| Print.ProjectId nullable FK                                                        | Task 1                                 |
| DbContext + migration + indexes                                                    | Task 2                                 |
| Project DTOs (Add, Put, Summary, Detail, Image)                                    | Task 3                                 |
| Print DTOs updated (projectId, projectName, newProjectName)                        | Task 4                                 |
| GroupedFeedItemDto                                                                 | Task 4                                 |
| AutoMapper profiles                                                                | Task 5                                 |
| IProjectService + ProjectService CRUD                                              | Task 6                                 |
| ProjectsController CRUD                                                            | Task 7                                 |
| Project image upload/delete/reorder                                                | Task 8                                 |
| Print create/update: projectId + newProjectName inline                             | Task 9                                 |
| GET /api/Prints/summary filterByProjectId                                          | Task 10                                |
| GET /api/Prints/grouped interleaved feed                                           | Task 11                                |
| Delete project: unlink or delete prints                                            | Task 6 (service) + Task 7 (controller) |
| Public/Unlisted projects accessible anonymously                                    | Task 7                                 |
