#!/usr/bin/env bash
set -e

FILE="src/views/leads/Leads.tsx"

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found. Run this from the repo root."
  exit 1
fi

BACKUP="${FILE}.bak-$(date +%s)"
cp "$FILE" "$BACKUP"
echo "Backup saved: $BACKUP"

PERL_SCRIPT="$(mktemp /tmp/leads_patch.XXXXXX.pl)"

cat > "$PERL_SCRIPT" <<'PERLEOF'
use strict;
use warnings;

my $file = shift @ARGV;
open(my $fh, '<', $file) or die "Cannot open $file: $!";
local $/;
my $content = <$fh>;
close($fh);

my $applied = 0;

sub apply_change {
    my ($content_ref, $label, $anchor, $replacement) = @_;
    if (index($$content_ref, $replacement) != -1) {
        print "SKIP (already applied): $label\n";
        return 0;
    }
    if (index($$content_ref, $anchor) == -1) {
        die "ASSERTION FAILED: anchor not found for: $label\n";
    }
    my $quoted_anchor = quotemeta($anchor);
    $$content_ref =~ s/$quoted_anchor/$replacement/;
    print "Applied: $label\n";
    return 1;
}

my $anchor1 = "  const [loading, setLoading] = useState(true);\n  const [selectedProject, setSelectedProject] = useState<string>('ALL');";
my $replacement1 = "  const [loading, setLoading] = useState(true);\n  const PAGE_SIZE = 50;\n  const [page, setPage] = useState(1);\n  const [hasMore, setHasMore] = useState(false);\n  const [loadingMore, setLoadingMore] = useState(false);\n  const loadedCountRef = useRef(0);\n  const [selectedProject, setSelectedProject] = useState<string>('ALL');";
$applied += apply_change(\$content, "pagination state", $anchor1, $replacement1);

my $anchor2 = <<'ANCHOR2';
  const fetchLeads = useCallback(async (search?: string) => {
    try {
      const res = await api.get('/leads', { params: { search } });
      let allLeads = res.data;
      if (user?.role === 'MANAGER') {
        if (!['ADMIN', 'master_admin', 'company_admin'].includes(user.role)) {
          allLeads = allLeads.filter((l: any) => l.owner_id === user.id);
        }
      }
      setLeads(allLeads);
    } catch (error) {
      console.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [user]);
ANCHOR2
chomp $anchor2;

my $replacement2 = <<'REPL2';
  const fetchLeads = useCallback(async (search?: string, pageNum: number = 1, append: boolean = false) => {
    try {
      if (append) setLoadingMore(true); else setLoading(true);
      const res = await api.get('/leads', { params: { search, page: pageNum, pageSize: PAGE_SIZE } });
      let newLeads = res.data;
      if (user?.role === 'MANAGER') {
        if (!['ADMIN', 'master_admin', 'company_admin'].includes(user.role)) {
          newLeads = newLeads.filter((l: any) => l.owner_id === user.id);
        }
      }
      setLeads(prev => (append ? [...prev, ...newLeads] : newLeads));
      setPage(pageNum);

      const totalCountHeader = res.headers?.['x-total-count'];
      const totalCount = totalCountHeader !== undefined ? parseInt(totalCountHeader, 10) : null;
      loadedCountRef.current = append ? loadedCountRef.current + newLeads.length : newLeads.length;

      if (totalCount !== null) {
        setHasMore(loadedCountRef.current < totalCount);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to fetch leads');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    fetchLeads(searchTerm, page + 1, true);
  };
REPL2
chomp $replacement2;

$applied += apply_change(\$content, "fetchLeads pagination + handleLoadMore", $anchor2, $replacement2);

my $anchor3 = "        </div>\n      </div>\n\n      {/* Lead Modal */}";
my $replacement3 = "        </div>\n      </div>\n\n      {hasMore && (\n        <div className=\"flex justify-center py-2\">\n          <button\n            onClick={handleLoadMore}\n            disabled={loadingMore}\n            className=\"px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-600 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed\"\n          >\n            {loadingMore ? 'Loading...' : 'Load More Leads'}\n          </button>\n        </div>\n      )}\n\n      {/* Lead Modal */}";
$applied += apply_change(\$content, "Load More button", $anchor3, $replacement3);

open(my $out, '>', $file) or die "Cannot write $file: $!";
print $out $content;
close($out);

print "Done. Changes applied: $applied\n";
PERLEOF

perl "$PERL_SCRIPT" "$FILE"
rm -f "$PERL_SCRIPT"

echo "Frontend pagination patch complete: $FILE"
